import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createSocialHandler} from './http.mjs';
import {actorFromClaims,requireTeam,topicKey} from './auth.mjs';
import {TeamChatRoom} from './chat-room.mjs';
const TEAM='680163';
const users={player:{uid:'p1',name:'Jugador',admin:false,trainer:false,teamId:TEAM},coach:{uid:'c1',name:'Entrenador',admin:false,trainer:true,teamId:TEAM},outsider:{uid:'p2',name:'Otro equipo',admin:false,trainer:false,teamId:'other'},admin:{uid:'a1',name:'Directiva',admin:true,trainer:true,teamId:null}};
const authenticate=async token=>{if(!users[token])throw Object.assign(Error('Sesión no válida'),{status:401});return {...users[token],expiresAt:Date.now()+300000}};
function database(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const transaction=fn=>{db.exec('BEGIN');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}};
 const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),all:async()=>({results:db.prepare(sql).all(...args)}),first:async()=>db.prepare(sql).get(...args),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),_execute:()=>({results:db.prepare(sql).all(...args)})});
 return {db,prepare,batch:async statements=>transaction(()=>statements.map(statement=>statement._execute())),transaction};
}
function service(){const db=database(),handle=createSocialHandler({authenticate});const request=async(path,value,token='player')=>{
 const response=await handle(new Request('https://club.test/api/social/'+path,{method:value===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)})}),{NOTIFICATIONS_DB:db});
 return {status:response.status,...await response.json()};
};return {db,request}}
test('solo cuentas verificadas y aprobadas; no se acepta un equipo ajeno',()=>{
 const claims={sub:'p',email_verified:true,email:'p@example.org',exp:Date.now()/1000+3600};
 assert.throws(()=>actorFromClaims({...claims,email_verified:false},{status:'approved',claim:{teamId:TEAM}}));
 for(const status of ['pending','revoked','rejected','unassigned'])assert.throws(()=>actorFromClaims(claims,{status,claim:{teamId:TEAM}}));
 const actor=actorFromClaims(claims,{status:'approved',claim:{teamId:TEAM,role:'player',name:'Mi nombre'}});assert.equal(actor.trainer,false);requireTeam(actor,TEAM);assert.throws(()=>requireTeam(actor,'otro'));assert.throws(()=>topicKey('match:otro:123'));
 assert.equal(actorFromClaims(claims,{status:'approved',claim:{teamId:TEAM}},true).admin,true);
});
test('comunidad autenticada, paginación y comentarios separados por partido',async()=>{
 const {request}=service();assert.equal((await request('posts',undefined,'bad')).status,401);
 for(let i=0;i<22;i++)assert.equal((await request('posts',{title:'Noticia '+i,body:'Hola equipo'})).status,201);
 const page=await request('posts');assert.equal(page.posts.length,20);const next=await request('posts?before='+page.next);assert.equal(next.posts.length,2);assert.equal(new Set([...page.posts,...next.posts].map(p=>p.id)).size,22);
 const topic='match:'+TEAM+':123';await request('comment',{topic,body:'Buen partido'});
 assert.equal((await request('thread?topic='+topic)).comments.length,1);assert.equal((await request('thread?topic=match:'+TEAM+':124')).comments.length,0);
});
test('me gusta idempotente, no se puede suplantar un autor ni borrar contenido ajeno',async()=>{
 const {request}=service(),topic='news:123';await request('like',{topic,liked:true});await request('like',{topic,liked:true});assert.equal((await request('thread?topic='+topic)).likes,1);
 await request('like',{topic,liked:false});assert.equal((await request('thread?topic='+topic)).likes,0);
 const {post}=await request('posts',{title:'Hola',body:'Texto',author_uid:'a1'});assert.equal(post.author_uid,'p1');
 assert.equal((await request('delete',{kind:'post',id:post.id},'coach')).status,403);
 assert.equal((await request('delete',{kind:'post',id:post.id},'admin')).status,200);
 assert.equal((await request('comment',{topic:'forum:'+post.id,body:'No debe guardarse'})).status,404);
});
test('denuncias restringidas a administración y eliminación resuelve la denuncia',async()=>{
 const {request}=service();const comment=await request('comment',{topic:'news:123',body:'Revisar'});
 await request('report',{id:comment.id,kind:'comment',reason:'Contenido inapropiado'},'coach');assert.equal((await request('reports')).status,403);
 const report=(await request('reports',undefined,'admin')).reports[0];assert.equal(report.content,'Revisar');
 await request('delete',{kind:'comment',id:comment.id},'admin');assert.equal((await request('reports',undefined,'admin')).reports.length,0);
});
test('límites diarios atómicos y validación de texto',async()=>{
 const {request}=service();assert.equal((await request('comment',{topic:'news:123',body:' '.repeat(10)})).status,400);
 assert.equal((await request('comment',{topic:'news:123',body:'a'.repeat(2001)})).status,400);
 for(let i=0;i<100;i++)assert.equal((await request('like',{topic:'news:123',liked:true})).status,200);
 assert.equal((await request('like',{topic:'news:123',liked:true})).status,429);
});
function chat(){
 const {db,transaction}=database(),sockets=[];let alarm;
 const ctx={storage:{sql:{exec:(sql,...args)=>{const rows=db.prepare(sql).all(...args);return {toArray:()=>rows}}},transactionSync:transaction,getAlarm:async()=>alarm,setAlarm:async value=>{alarm=value}},getWebSockets:()=>sockets};
 const room=new TeamChatRoom(ctx,{}, {authenticate});db.prepare('INSERT INTO room(id,team) VALUES (1,?)').run(TEAM);
 const socket=()=>{let attachment={openedAt:Date.now(),actor:null};const ws={readyState:1,sent:[],serializeAttachment:s=>attachment=s,deserializeAttachment:()=>attachment,send:raw=>ws.sent.push(JSON.parse(raw)),close:code=>{ws.code=code;ws.readyState=3}};sockets.push(ws);return ws};
 const send=(ws,value)=>room.webSocketMessage(ws,JSON.stringify(value));return {db,room,socket,send};
}
test('chat: no filtra historial antes de autenticar y rechaza miembros de otro equipo',async()=>{
 const {socket,send}=chat(),ws=socket();await send(ws,{type:'history'});assert.equal(ws.sent[0].status,401);assert.equal(ws.sent.some(e=>e.messages),false);
 const other=socket();await send(other,{type:'auth',token:'outsider'});assert.equal(other.sent[0].status,403);assert.equal(other.sent.some(e=>e.messages),false);
});
test('chat: mensaje en directo, reintento sin duplicados, historial y borrado por entrenador',async()=>{
 const {db,socket,send}=chat(),p=socket(),coach=socket();await send(p,{type:'auth',token:'player'});await send(coach,{type:'auth',token:'coach'});
 const id=crypto.randomUUID();await send(p,{type:'message',id,body:'Hola equipo',uid:'a1'});assert.equal(coach.sent.at(-1).message.uid,'p1');
 await send(p,{type:'message',id,body:'Hola equipo'});assert.equal(db.prepare('SELECT count(*) AS n FROM messages').get().n,1);
 await send(p,{type:'report',id,reason:'Revisar'});await send(p,{type:'reports'});assert.equal(p.sent.at(-1).status,403);
 // Use a fresh socket: the previous unauthorized moderation attempt closes it.
 const p2=socket();await send(p2,{type:'auth',token:'player'});
 await send(coach,{type:'reports'});assert.equal(coach.sent.at(-1).reports.length,1);
 await send(coach,{type:'delete',id});assert.equal(p2.sent.at(-1).type,'deleted');await send(p2,{type:'history'});assert.equal(p2.sent.at(-1).messages[0].body,'');
});
test('chat: sesión caducada no recibe ni publica; límites por persona y equipo',async()=>{
 const {db,socket,send,room}=chat(),ws=socket();await send(ws,{type:'auth',token:'player'});
 ws.serializeAttachment({actor:{...users.player,expiresAt:Date.now()-1}});room.broadcast({type:'secret'});assert.equal(ws.sent.some(e=>e.type==='secret'),false);
 await send(ws,{type:'message',id:crypto.randomUUID(),body:'No'});assert.equal(ws.sent.at(-1).status,401);assert.equal(db.prepare('SELECT count(*) AS n FROM messages').get().n,0);
 const day=new Date().toISOString().slice(0,10);db.prepare('INSERT INTO budget VALUES (?,?,?)').run('team',day,1000);assert.throws(()=>room.budget('p1'));assert.equal(db.prepare("SELECT n FROM budget WHERE bucket='user:p1'").get(),undefined);
});
