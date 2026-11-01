import {authenticateSocial,requireTeam,requireModerator,text,idKey,fail,pageCursor} from './auth.mjs';
const DAY=86400000;
export class TeamChatRoom {
 constructor(ctx,env,dependencies={}){
  this.ctx=ctx;this.env=env;this.authenticate=dependencies.authenticate||authenticateSocial;this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY,team TEXT NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS messages (seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,uid TEXT NOT NULL,name TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS message_author_date ON messages(uid,created_at)');
  this.sql.exec('CREATE INDEX IF NOT EXISTS message_date ON messages(created_at)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS budget (bucket TEXT NOT NULL,day TEXT NOT NULL,n INTEGER NOT NULL,PRIMARY KEY(bucket,day))');
  this.sql.exec('CREATE TABLE IF NOT EXISTS reports (message_id TEXT NOT NULL,uid TEXT NOT NULL,reason TEXT NOT NULL,created_at INTEGER NOT NULL,resolved INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(message_id,uid))');
  this.sql.exec('CREATE INDEX IF NOT EXISTS reports_open ON reports(resolved,created_at)');
 }
 team(){return this.sql.exec('SELECT team FROM room WHERE id=1').toArray()[0]?.team}
 send(ws,value){ws.send(JSON.stringify(value))}
 broadcast(value){for(const ws of this.ctx.getWebSockets()){const s=ws.deserializeAttachment();if(s?.actor&&s.actor.expiresAt>Date.now())try{this.send(ws,value)}catch{}}}
 history(before=Number.MAX_SAFE_INTEGER){const rows=this.sql.exec('SELECT * FROM messages WHERE seq<? ORDER BY seq DESC LIMIT 51',before).toArray();return {messages:rows.slice(0,50).reverse(),next:rows.length>50?rows[49].seq:null}}
 budget(uid){
  const day=new Date().toISOString().slice(0,10);
  this.ctx.storage.transactionSync(()=>{
   for(const [bucket,max] of [['user:'+uid,100],['team',1000]]){
    const row=this.sql.exec('INSERT INTO budget(bucket,day,n) VALUES (?,?,1) ON CONFLICT(bucket,day) DO UPDATE SET n=n+1 WHERE n<? RETURNING n',bucket,day,max).toArray();
    if(!row.length)throw fail('Se ha alcanzado el límite diario del chat. Vuelve mañana.',429);
   }
  });
 }
 async fetch(request){
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket requerido',{status:426});
  const team=new URL(request.url).searchParams.get('team');
  this.sql.exec('INSERT OR IGNORE INTO room(id,team) VALUES (1,?)',team);
  if(team!==this.team())return new Response('Equipo incorrecto',{status:403});
  if(this.ctx.getWebSockets().length>=100)return new Response('Sala completa. Vuelve a intentarlo más tarde.',{status:429});
  if(this.ctx.getWebSockets().filter(ws=>!ws.deserializeAttachment()?.actor).length>=10)return new Response('Demasiadas conexiones pendientes.',{status:429});
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);server.serializeAttachment({openedAt:Date.now(),actor:null});
  await this.scheduleSweep();
  return new Response(null,{status:101,webSocket:client});
 }
 async scheduleSweep(){
  const deadlines=this.ctx.getWebSockets().filter(ws=>ws.readyState===1).map(ws=>{const s=ws.deserializeAttachment();return s?.actor?.expiresAt||((s?.openedAt||Date.now())+10000)});
  const next=Math.min(Date.now()+DAY,...deadlines);
  const current=await this.ctx.storage.getAlarm();if(!current||next<current)await this.ctx.storage.setAlarm(next);
 }
 async alarm(){
  const now=Date.now();for(const ws of this.ctx.getWebSockets()){const s=ws.deserializeAttachment();if((s?.actor?.expiresAt||(s?.openedAt||0)+10000)<=now)ws.close(4001,'Renueva tu sesión');}
  // Text history retained for 90 days; indexed time cleanup and bounded daily work.
  this.sql.exec('DELETE FROM messages WHERE seq IN (SELECT seq FROM messages WHERE created_at<? LIMIT 1000)',now-90*DAY);
  this.sql.exec('DELETE FROM budget WHERE day<?',new Date(now-2*DAY).toISOString().slice(0,10));
  this.sql.exec('DELETE FROM reports WHERE created_at<?',now-90*DAY);
  if(this.ctx.getWebSockets().some(ws=>ws.readyState===1))await this.scheduleSweep();
 }
 async webSocketMessage(ws,raw){
  let value;
  try{
   if(typeof raw!=='string'||raw.length>16000)throw fail('Mensaje no válido.');
   try{value=JSON.parse(raw)}catch{throw fail('Mensaje no válido.')}
   const state=ws.deserializeAttachment()||{};
   if(value.type==='auth'){
    if(state.actor&&state.actor.expiresAt>Date.now()+120000)throw fail('La sesión ya está activa.',429);
    const actor=await this.authenticate(value.token);requireTeam(actor,this.team());
    ws.serializeAttachment({openedAt:state.openedAt,actor});
    this.send(ws,{type:'ready',uid:actor.uid,moderator:actor.trainer,expiresAt:actor.expiresAt,...this.history()});await this.scheduleSweep();return;
   }
   const actor=state.actor;if(!actor||actor.expiresAt<=Date.now())throw fail('Renueva la sesión del chat.',401);
   requireTeam(actor,this.team());
   if(value.type==='history'){this.send(ws,{type:'history',...this.history(pageCursor(value.before))});return}
   if(value.type==='message'){
    const copy=text(value.body),id=idKey(value.id);
    const existing=this.sql.exec('SELECT * FROM messages WHERE id=?',id).toArray()[0];
    if(existing){if(existing.uid!==actor.uid)throw fail('Identificador de mensaje ocupado.',409);this.send(ws,{type:'message',message:existing});return}
    const previous=this.sql.exec('SELECT created_at FROM messages WHERE uid=? ORDER BY created_at DESC LIMIT 1',actor.uid).toArray()[0];
    if(previous&&Date.now()-previous.created_at<2000)throw fail('Espera un momento antes de enviar otro mensaje.',429);
    this.budget(actor.uid);
    const message=this.sql.exec('INSERT INTO messages(id,uid,name,body,created_at) VALUES (?,?,?,?,?) RETURNING *',id,actor.uid,actor.name,copy,Date.now()).toArray()[0];
    this.broadcast({type:'message',message});return;
   }
   if(value.type==='delete'){
    const id=idKey(value.id),message=this.sql.exec('SELECT * FROM messages WHERE id=?',id).toArray()[0];if(!message)throw fail('Mensaje no encontrado.',404);
    if(message.uid!==actor.uid)requireModerator(actor,this.team());this.budget(actor.uid);
    this.sql.exec("UPDATE messages SET body='',deleted=1 WHERE id=?",id);this.sql.exec('UPDATE reports SET resolved=1 WHERE message_id=?',id);
    this.broadcast({type:'deleted',id});return;
   }
   if(value.type==='report'){
    const id=idKey(value.id),reason=text(value.reason,300);
    if(!this.sql.exec('SELECT id FROM messages WHERE id=? AND deleted=0',id).toArray().length)throw fail('Mensaje no encontrado.',404);
    this.budget(actor.uid);this.sql.exec('INSERT OR IGNORE INTO reports(message_id,uid,reason,created_at) VALUES (?,?,?,?)',id,actor.uid,reason,Date.now());this.send(ws,{type:'reported'});return;
   }
   if(value.type==='reports'){
    requireModerator(actor,this.team());this.send(ws,{type:'reports',reports:this.sql.exec('SELECT r.message_id,r.reason,r.created_at,m.name,m.body FROM reports r JOIN messages m ON m.id=r.message_id WHERE r.resolved=0 ORDER BY r.created_at DESC LIMIT 50').toArray()});return;
   }
   if(value.type==='resolve'){
    requireModerator(actor,this.team());this.budget(actor.uid);this.sql.exec('UPDATE reports SET resolved=1 WHERE message_id=?',idKey(value.id));this.send(ws,{type:'resolved'});return;
   }
   throw fail('Acción no válida.');
  }catch(e){this.send(ws,{type:'error',error:e.status?e.message:'El chat no está disponible ahora.',status:e.status||503,requestId:value?.id});if(e.status===401||e.status===403)ws.close(4001,'Acceso no autorizado');}
 }
 webSocketClose(ws,code){ws.close(code===1005?1000:code)}
 webSocketError(ws){ws.close(1011,'Error de conexión')}
}
