import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {handleVisits} from './visits-service.mjs';
const require=createRequire(import.meta.url);
const {createVisitsClient}=require('./visits-client.cjs');
const {instagramPostUrl}=require('./instagram-post.cjs');
const id=n=>n.toString(16).padStart(64,'0');
function database(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('./visit-schema.sql',import.meta.url),'utf8'));t.after(()=>sqlite.close());
 const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),first:async()=>sqlite.prepare(sql).get(...args),execute:()=>/^\s*SELECT/i.test(sql)?{results:sqlite.prepare(sql).all(...args),success:true}:(sqlite.prepare(sql).run(...args),{results:[],success:true})});
 return {VISITS_DB:{prepare,batch:async statements=>{sqlite.exec('BEGIN');try{const results=statements.map(statement=>statement.execute());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}}}};
}
const post=(events,headers={})=>new Request('https://app.test/api/visits',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({events})});
async function total(env){return (await (await handleVisits(new Request('https://app.test/api/visits'),env)).json()).total}
function memory(){const map=new Map();return {map,getItem:async key=>map.get(key)||null,setItem:async(key,value)=>map.set(key,value)}}
function bridge(env){return async(path,options={})=>{const response=await handleVisits(new Request('https://app.test'+path,options),env);const data=await response.json();if(!response.ok)throw Error(data.error);return data}}

test('el contador compartido suma aperturas distintas y no duplica reintentos',async t=>{
 const env=database(t);const events=[{id:id(1),platform:'android'},{id:id(2),platform:'ios'},{id:id(1),platform:'android'}];
 assert.equal((await (await handleVisits(post(events),env)).json()).total,2);
 assert.equal((await (await handleVisits(post(events),env)).json()).total,2);
 await handleVisits(post([{id:id(3),platform:'android'}]),env);
 assert.equal(await total(env),3);assert.equal(await total(env),3);
});
test('rechaza visitas malformadas, tráfico web y orígenes ajenos sin modificar el contador',async t=>{
 const env=database(t);
 for(const events of [[],[{id:'invalid',platform:'android'}],[{id:id(1),platform:'web'}],Array.from({length:51},(_,n)=>({id:id(n),platform:'android'}))])assert.equal((await handleVisits(post(events),env)).status,400);
 assert.equal((await handleVisits(post([{id:id(1),platform:'android'}],{Origin:'https://other.test'}),env)).status,403);
 assert.equal(await total(env),0);
 assert.equal((await handleVisits(new Request('https://app.test/api/visits'),{})).status,503);
});
test('el Worker conecta el contador antes de la caché y permite el POST de la app',async t=>{
 const env=database(t),worker=(await import('./cloudflare-worker.mjs')).default,ctx={waitUntil(){}};
 const options=await worker.fetch(new Request('https://app.test/api/visits',{method:'OPTIONS'}),env,ctx);
 assert.match(options.headers.get('Access-Control-Allow-Methods'),/POST/);
 const response=await worker.fetch(post([{id:id(1),platform:'android'}]),env,ctx);
 assert.equal(response.status,200);assert.equal((await response.json()).total,1);assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('cuenta todos los móviles y una sola apertura por proceso, aunque se monte la pantalla varias veces',async t=>{
 const env=database(t);let sequence=0;const request=bridge(env),randomId=async()=>id(++sequence);
 const first=createVisitsClient({storage:memory(),request,randomId,platform:'android'}),second=createVisitsClient({storage:memory(),request,randomId,platform:'android'});
 await Promise.all([first.start(),first.start()]);await second.start();
 await first.getTotal();await first.getTotal();assert.equal(await total(env),2);
 const web=createVisitsClient({storage:memory(),request,randomId,platform:'web'});await web.start();await web.getTotal();await web.resume(31*60*1000);assert.equal(await total(env),2);
});
test('conserva visitas sin conexión y un acuse perdido no las vuelve a contar al reiniciar',async t=>{
 const env=database(t),storage=memory(),server=bridge(env);let online=false,loseReply=false,sequence=0;
 const request=async(...args)=>{if(!online)throw Error('Sin red');const result=await server(...args);if(loseReply){loseReply=false;throw Error('Acuse perdido')}return result};
 const create=()=>createVisitsClient({storage,request,randomId:async()=>id(++sequence),platform:'android'});
 const first=create();await assert.rejects(first.start());assert.equal(await total(env),0);
 online=true;loseReply=true;await assert.rejects(first.flush());assert.equal(await total(env),1);
 const restarted=create();await restarted.start();assert.equal(await total(env),2);assert.equal((await restarted.readCached()).total,2);
 await restarted.flush();assert.equal(await total(env),2);
});
test('volver brevemente no suma otra visita; tras treinta minutos empieza una nueva',async t=>{
 const env=database(t);let sequence=0;
 const client=createVisitsClient({storage:memory(),request:bridge(env),randomId:async()=>id(++sequence),platform:'android'});
 await client.start();await client.resume(1000);await client.resume(29*60*1000);assert.equal(await total(env),1);
 await client.resume(30*60*1000);assert.equal(await total(env),2);
});
test('un envío vacío de primer plano no pierde la apertura que se acaba de guardar',async t=>{
 const env=database(t),base=memory();let release,started,persisted;
 const paused=new Promise(resolve=>{release=resolve}),reading=new Promise(resolve=>{started=resolve}),added=new Promise(resolve=>{persisted=resolve});let hold=true;
 const storage={getItem:async key=>{if(hold&&key.includes('.total.')){hold=false;started();await paused}return base.getItem(key)},setItem:async(key,value)=>{await base.setItem(key,value);if(key.includes('.pending.'))persisted()}};
 const client=createVisitsClient({storage,request:bridge(env),randomId:async()=>id(1),platform:'android'});
 const first=client.flush();await reading;const opening=client.start();await added;release();
 await Promise.all([first,opening]);assert.equal(await total(env),1);
});
test('envía la cola en lotes de cincuenta y conserva el total global cuando no hay conexión',async t=>{
 const env=database(t),storage=memory(),server=bridge(env);let online=false,sequence=0;const batches=[];
 const request=async(path,options)=>{if(!online)throw Error('Sin red');if(options?.body)batches.push(JSON.parse(options.body).events.length);return server(path,options)};
 let client;
 for(let n=0;n<61;n++){client=createVisitsClient({storage,request,randomId:async()=>id(++sequence),platform:'android'});await assert.rejects(client.start())}
 online=true;await client.flush();assert.deepEqual(batches,[50,11]);assert.equal(await total(env),61);
 online=false;await assert.rejects(client.getTotal());assert.equal((await client.readCached()).total,61);
});
test('la foto enlaza a la publicación real y descarta enlaces ajenos o con credenciales',()=>{
 assert.equal(instagramPostUrl({permalink:'https://www.instagram.com/p/club/'}),'https://www.instagram.com/p/club/');
 for(const permalink of ['javascript:alert(1)','https://instagram.com.evil.test/p/a','https://user:pass@instagram.com/p/a','http://instagram.com/p/a',undefined])assert.equal(instagramPostUrl({permalink}),'https://www.instagram.com/villalbillacf/');
});
test('la publicación OTA solo permite las bases nativas verificadas y no altera una compilación nueva',()=>{
 const configure=require('./app.config.js'),config=require('./app.json').expo,previous=process.env.VILLALBILLA_UPDATE_RUNTIME,build=process.env.EAS_BUILD;
 try{
  delete process.env.VILLALBILLA_UPDATE_RUNTIME;assert.deepEqual(configure({config}).runtimeVersion,{policy:'appVersion'});
  process.env.VILLALBILLA_UPDATE_RUNTIME='0.1.11';assert.equal(configure({config}).runtimeVersion,'0.1.11');
  process.env.VILLALBILLA_UPDATE_RUNTIME='0.1.12';assert.equal(configure({config}).runtimeVersion,'0.1.12');
  process.env.VILLALBILLA_UPDATE_RUNTIME='0.1.8';assert.throws(()=>configure({config}));
  process.env.VILLALBILLA_UPDATE_RUNTIME='0.1.11';process.env.EAS_BUILD='true';assert.throws(()=>configure({config}));
 }finally{if(previous===undefined)delete process.env.VILLALBILLA_UPDATE_RUNTIME;else process.env.VILLALBILLA_UPDATE_RUNTIME=previous;if(build===undefined)delete process.env.EAS_BUILD;else process.env.EAS_BUILD=build}
});
