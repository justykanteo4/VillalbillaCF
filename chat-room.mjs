export class ChatRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.writes=Promise.resolve()}
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/socket'){
   const context=JSON.parse(request.headers.get('X-Chat-Context')||'null');if(!context||context.expires<=Date.now())return new Response('Caducado',{status:401});
   const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment(context);await this.schedule();return new Response(null,{status:101,webSocket:pair[0]});
  }
  const row=await request.json();const job=this.writes.catch(()=>{}).then(()=>this.send(row));this.writes=job;return job;
 }
 async send(row){
  const db=this.env.CHAT_DB;
  const old=await db.prepare('SELECT sender_id,body FROM chat_messages WHERE room=? AND id=?').bind(row.room,row.id).first();
  if(old){if(old.sender_id!==row.uid||old.body!==row.body)return Response.json({error:'Mensaje no válido.'},{status:409});return Response.json({saved:true})}
  const rate=await db.prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE sender_id=? AND created_at>?').bind(row.uid,Date.now()-60000).first();if(rate.n>=20)return Response.json({error:'Espera un momento antes de enviar más mensajes.'},{status:429});
  const message={id:row.id,senderId:row.uid,senderName:row.name,body:row.body,createdAt:Date.now()};
  await db.prepare('INSERT OR IGNORE INTO chat_messages VALUES(?,?,?,?,?,?)').bind(row.room,row.id,row.uid,row.name,row.body,message.createdAt).run();
  for(const socket of this.ctx.getWebSockets()){const info=socket.deserializeAttachment();if(info?.expires>Date.now())try{socket.send(JSON.stringify(message))}catch{}else try{socket.close(4001,'Renovar acceso')}catch{}}
  return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});
 }
 async schedule(){const all=this.ctx.getWebSockets().map(s=>s.deserializeAttachment()?.expires).filter(v=>v>Date.now());if(all.length)await this.ctx.storage.setAlarm(Math.min(...all))}
 async alarm(){for(const s of this.ctx.getWebSockets())if(s.deserializeAttachment()?.expires<=Date.now())try{s.close(4001,'Renovar acceso')}catch{}await this.schedule()}
 webSocketMessage(socket){socket.close(1008,'Usa el envío autenticado')}
 webSocketClose(socket,code){try{socket.close(code)}catch{}}
 webSocketError(socket){try{socket.close(1011)}catch{}}
}
