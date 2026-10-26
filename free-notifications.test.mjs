import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createECDH,randomBytes} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import webpush from 'web-push';
import {handleFreeNotifications,dispatchPending,validWebSubscription,validateNotice,FREE_LIMITS} from './free-notifications.mjs';

class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('./notification-schema.sql',import.meta.url),'utf8'))}
 prepare(sql){const stmt=this.db.prepare(sql);return {bind:(...params)=>({run:async()=>({meta:{changes:Number(stmt.run(...params).changes)}}),first:async()=>stmt.get(...params),all:async()=>({results:stmt.all(...params)})}),run:async()=>({meta:{changes:Number(stmt.run().changes)}}),first:async()=>stmt.get(),all:async()=>({results:stmt.all()})}}
 async batch(statements){this.db.exec('BEGIN');try{const result=[];for(const stmt of statements)result.push(await stmt.run());this.db.exec('COMMIT');return result}catch(e){this.db.exec('ROLLBACK');throw e}}
}
const subscription=()=>{const ecdh=createECDH('prime256v1');ecdh.generateKeys();return {endpoint:'https://web.push.apple.com/test/'+randomBytes(8).toString('hex'),keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}}};
const request=(path,value,token)=>new Request('https://club.example'+path,{method:value?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})});
const jobs=[],ctx={waitUntil:job=>jobs.push(job)};
const makeEnv=()=>{const keys=webpush.generateVAPIDKeys();return {NOTIFICATIONS_DB:new D1(),WEB_PUSH_PUBLIC_KEY:keys.publicKey,WEB_PUSH_PRIVATE_KEY:keys.privateKey}};

test('valida destinos push y bloquea direcciones arbitrarias',()=>{
 const s=subscription();assert(validWebSubscription(s));
 for(const endpoint of ['http://web.push.apple.com/x','https://web.push.apple.com.evil.org/x','http://127.0.0.1/x','https://user:pass@web.push.apple.com/x'])assert(!validWebSubscription({...s,endpoint}));
 assert(!validWebSubscription({...s,keys:{p256dh:'invalid',auth:'invalid'}}));
 assert.throws(()=>validateNotice({title:'Hola',body:'Texto',all:false,teamIds:[],playerIds:[]}));
});
test('suscripción, cambio de favoritos y baja conservan el control del dispositivo',async()=>{
 const env=makeEnv(),s=subscription(),value={enabled:true,installationKey:'a'.repeat(64),provider:'web',subscription:s,teamIds:['680163'],playerIds:[]};
 assert.equal((await handleFreeNotifications(request('/api/push/subscription',value),env,ctx)).status,200);
 assert.equal((await handleFreeNotifications(request('/api/push/subscription',{...value,teamIds:['42']}),env,ctx)).status,200);
 assert.equal(env.NOTIFICATIONS_DB.db.prepare('SELECT team_ids FROM push_subscriptions').get().team_ids,'["42"]');
 await handleFreeNotifications(request('/api/push/subscription',{enabled:false,installationKey:'b'.repeat(64)}),env,ctx);
 assert.equal(env.NOTIFICATIONS_DB.db.prepare('SELECT enabled FROM push_subscriptions').get().enabled,1);
 await handleFreeNotifications(request('/api/push/subscription',{enabled:false,installationKey:'a'.repeat(64)}),env,ctx);
 assert.equal(env.NOTIFICATIONS_DB.db.prepare('SELECT enabled FROM push_subscriptions').get().enabled,0);
});
test('origen ajeno y administrador no autenticado no pueden publicar',async()=>{
 const env=makeEnv();assert.equal((await handleFreeNotifications(request('/api/push/send',{}),env,ctx)).status,401);
 const foreign=request('/api/push/subscription',{});foreign.headers.set('Origin','https://evil.example');assert.equal((await handleFreeNotifications(foreign,env,ctx)).status,403);
});
test('JWT verificado publica solo para destinatarios, cifra Web Push y no reenvía aceptados',async()=>{
 const env=makeEnv(),pair=await generateKeyPair('RS256'),jwk=await exportJWK(pair.publicKey);jwk.kid='test';
 const token=await new SignJWT({email:'albaresfernandez@gmail.com',email_verified:false,firebase:{sign_in_provider:'google.com'}}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://securetoken.google.com/villalbillacf').setAudience('villalbillacf').setSubject('admin').setExpirationTime('5m').sign(pair.privateKey);
 const original=globalThis.fetch;let pushes=0;
 globalThis.fetch=async(url,options)=>{
  if(String(url).includes('googleapis.com/service_accounts'))return Response.json({keys:[jwk]});
  assert(String(url).startsWith('https://web.push.apple.com/'));assert(options.headers.Authorization||options.headers.authorization);assert(options.body.byteLength>0);pushes++;return new Response(null,{status:201});
 };
 try{
  for(const [i,team]of [[1,'680163'],[2,'42']])await handleFreeNotifications(request('/api/push/subscription',{installationKey:String(i).repeat(64),enabled:true,provider:'web',subscription:subscription(),teamIds:[team],playerIds:[]}),env,ctx);
  const sent=await handleFreeNotifications(request('/api/push/send',{title:'Entrenamiento',body:'Mañana a las 18:00',all:false,teamIds:['680163'],playerIds:[]},token),env,ctx);
  assert.equal(sent.status,200);await Promise.all(jobs.splice(0));assert.equal(pushes,1);
  await dispatchPending(env);assert.equal(pushes,1);
  const inbox=await(await handleFreeNotifications(request('/api/notifications'),env,ctx)).json();assert.equal(inbox.messages.length,1);
  const insert=env.NOTIFICATIONS_DB.db.prepare('INSERT INTO club_notices VALUES(?,?,?,?,?,?,?,?,?)');for(let i=1;i<FREE_LIMITS.noticesPerDay;i++)insert.run('n'+i,'a','b',1,'[]','[]','admin',Date.now(),1);
  assert.equal((await handleFreeNotifications(request('/api/push/send',{title:'Límite',body:'Texto',all:true,teamIds:[],playerIds:[]},token),env,ctx)).status,429);
 }finally{globalThis.fetch=original}
});
test('el límite de dispositivos no activa un servicio de pago',async()=>{
 const env=makeEnv(),db=env.NOTIFICATIONS_DB.db,stmt=db.prepare('INSERT INTO push_subscriptions VALUES(?,?,?,?,?,?,?,?)');
 for(let i=0;i<FREE_LIMITS.subscriptions;i++)stmt.run('id'+i,'dest'+i,'web','{}','[]','[]',1,Date.now());
 const response=await handleFreeNotifications(request('/api/push/subscription',{installationKey:'d'.repeat(64),enabled:true,provider:'web',subscription:subscription(),teamIds:[],playerIds:[]}),env,ctx);
 assert.equal(response.status,429);assert.equal(db.prepare('SELECT count(*) n FROM push_subscriptions').get().n,FREE_LIMITS.subscriptions);
});

test('el límite se comprueba también al insertar aunque el recuento previo quede obsoleto',async()=>{
 const env=makeEnv(),db=env.NOTIFICATIONS_DB.db,stmt=db.prepare('INSERT INTO push_subscriptions VALUES(?,?,?,?,?,?,?,?)');
 for(let i=0;i<FREE_LIMITS.subscriptions;i++)stmt.run('id'+i,'dest'+i,'web','{}','[]','[]',1,Date.now());
 const prepare=env.NOTIFICATIONS_DB.prepare.bind(env.NOTIFICATIONS_DB);
 env.NOTIFICATIONS_DB.prepare=sql=>sql.startsWith('SELECT count(*) AS n')?{bind:()=>({first:async()=>({n:FREE_LIMITS.subscriptions-1})})}:prepare(sql);
 const response=await handleFreeNotifications(request('/api/push/subscription',{installationKey:'e'.repeat(64),enabled:true,provider:'web',subscription:subscription(),teamIds:[],playerIds:[]}),env,ctx);
 assert.equal(response.status,429);
 assert.equal(db.prepare('SELECT count(*) n FROM push_subscriptions WHERE enabled=1').get().n,FREE_LIMITS.subscriptions);
});

test('una sesión manipulada no puede enviar avisos ni procesar la cola',async()=>{
 const env=makeEnv();
 for(const path of ['/api/push/send','/api/push/dispatch']){
  const response=await handleFreeNotifications(request(path,{title:'Aviso',body:'Texto',all:true,teamIds:[],playerIds:[]},'invalid.jwt.signature'),env,ctx);
  assert.equal(response.status,401);
 }
 assert.equal(env.NOTIFICATIONS_DB.db.prepare('SELECT count(*) n FROM club_notices').get().n,0);
});
