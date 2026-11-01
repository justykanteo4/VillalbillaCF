import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const pair=await generateKeyPair('RS256'),jwk={...await exportJWK(pair.publicKey),kid:'runtime-test',alg:'RS256'};
const token=await new SignJWT({email:'p@example.org',email_verified:true}).setProtectedHeader({alg:'RS256',kid:'runtime-test'}).setIssuer('https://securetoken.google.com/villalbillacf').setAudience('villalbillacf').setSubject('p1').setExpirationTime('10m').sign(pair.privateKey);
const outboundService=async request=>{
 const url=new URL(request.url);
 if(url.hostname==='www.googleapis.com')return Response.json({keys:[jwk]});
 if(url.hostname==='firestore.googleapis.com'){
  if(url.pathname.endsWith('/trainerProfiles/p1'))return Response.json({fields:{status:{stringValue:'approved'},name:{stringValue:'Jugador de prueba'},claim:{mapValue:{fields:{teamId:{stringValue:'680163'},role:{stringValue:'player'}}}}}});
  return new Response(null,{status:404});
 }
 throw Error('Unexpected external request '+url.hostname);
};
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'social-test',modules:true,scriptPath:new URL('../work/worker-social/cloudflare-worker.js',import.meta.url).pathname,compatibilityDate:'2026-10-22',compatibilityFlags:['nodejs_compat'],d1Databases:{NOTIFICATIONS_DB:'test-social'},durableObjects:{TEAM_CHAT:{className:'TeamChatRoom',useSQLite:true}},outboundService}]}));
try{
 const db=await mf.getD1Database('NOTIFICATIONS_DB');
 for(const sql of readFileSync(new URL('./schema.sql',import.meta.url),'utf8').split(';').filter(sql=>sql.trim()))await db.prepare(sql).run();
 const request=async(path,value)=>mf.dispatchFetch('https://club.test/api/social/'+path,{method:value?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(value?{body:JSON.stringify(value)}:{})});
 const posted=await request('posts',{title:'Prueba local',body:'No se publica en producción'});assert.equal(posted.status,201,await posted.clone().text());
 const {post}=await posted.json();await request('comment',{topic:'forum:'+post.id,body:'Comentario de prueba'});const thread=await request('thread?topic=forum:'+post.id);assert.equal((await thread.json()).comments.length,1);
 const preflight=await mf.dispatchFetch('https://club.test/api/social/comment',{method:'OPTIONS',headers:{Origin:'https://mobile.test'}});assert(preflight.headers.get('Access-Control-Allow-Methods').includes('POST'));
 const open=async()=>{const response=await mf.dispatchFetch('https://club.test/api/social/chat?team=680163',{headers:{Upgrade:'websocket'}});assert.equal(response.status,101);const ws=response.webSocket;ws.accept();return ws};
 const receive=ws=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('WebSocket timeout')),10000);ws.addEventListener('message',event=>{clearTimeout(timeout);resolve(JSON.parse(event.data))},{once:true})});
 const a=await open(),readyA=receive(a);a.send(JSON.stringify({type:'auth',token}));assert.equal((await readyA).type,'ready');
 const b=await open(),readyB=receive(b);b.send(JSON.stringify({type:'auth',token}));await readyB;
 const gotA=receive(a),gotB=receive(b),id=crypto.randomUUID();a.send(JSON.stringify({type:'message',id,body:'Mensaje local'}));assert.equal((await gotA).message.id,id);assert.equal((await gotB).message.body,'Mensaje local');
 a.close();b.close();console.log('Runtime Cloudflare real: D1, JWT, CORS y chat entre dos WebSockets correctos.');
}finally{await mf.dispose()}
