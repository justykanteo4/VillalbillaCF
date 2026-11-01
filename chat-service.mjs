import {verifyAccessUser} from './access-service.mjs';
import core from './chat-core.cjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message,status=403)=>Object.assign(Error(message),{status});
const profiles=new Map();
async function firestore(request,path,options={}){
 const response=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/'+path,{...options,headers:{Authorization:request.headers.get('Authorization'),'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw fail(response.status===403?'Tu cuenta no tiene acceso a este chat.':'No se pudieron comprobar los permisos.',response.status===403?403:503);
 return response.json();
}
const value=f=>f?.stringValue,strings=f=>(f?.arrayValue?.values||[]).map(value).filter(Boolean);
export async function chatIdentity(request,uid,teamId,peerId){
 const cacheKey=uid+':'+teamId+':'+(peerId||''),old=profiles.get(cacheKey);
 if(old&&old.until>Date.now())return old.profile;
 const doc=await firestore(request,'trainerProfiles/'+encodeURIComponent(uid)),p=doc.fields,c=p?.claim?.mapValue?.fields;
 const teamIds=[...new Set([value(c?.teamId),...strings(c?.teamIds)].filter(Boolean))];
 if(!['approved','admin'].includes(value(p?.status))||!['trainer','player'].includes(value(c?.role))||!teamIds.includes(teamId))throw fail('Tu cuenta no tiene acceso a este equipo.');
 if(peerId){if(peerId===uid)throw fail('Selecciona otra persona.',400);await firestore(request,'teamChats/'+teamId+'/members/'+encodeURIComponent(peerId))}
 const profile={uid,name:value(c.name),role:value(c.role),teamIds};
 if(profiles.size>1000)profiles.clear();profiles.set(cacheKey,{profile,until:Date.now()+30000});return profile;
}
export const roomKey=(team,uid,peer)=>team+':'+(peer?core.directChatId(uid,peer):'group');
export async function importLegacy(request,env,room,teamId,uid,peerId){
 if(await env.CHAT_DB.prepare('SELECT room FROM chat_migrations WHERE room=?').bind(room).first())return;
 const parent='teamChats/'+teamId+(peerId?'/direct/'+core.directChatId(uid,peerId):'');
 if(peerId){const r=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/'+parent,{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(12000)});if(r.status===404){await env.CHAT_DB.prepare('INSERT OR IGNORE INTO chat_migrations VALUES(?,?)').bind(room,Date.now()).run();return}if(!r.ok)throw fail('No se pudo recuperar el historial anterior.',503)}
 const data=await firestore(request,parent+':runQuery',{method:'POST',body:JSON.stringify({structuredQuery:{from:[{collectionId:'messages'}],orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'}],limit:500}})});
 const messages=[];
 for(const row of data){if(!row.document)continue;const d=row.document,f=d.fields,time=Date.parse(f.createdAt?.timestampValue),body=value(f.body),sender=value(f.senderId),name=value(f.senderName);if(!body||!sender||!name||!Number.isFinite(time))continue;messages.push([room,d.name.split('/').pop(),sender,name,body,time])}
 const writes=[];for(let i=0;i<messages.length;i+=16){const chunk=messages.slice(i,i+16);writes.push(env.CHAT_DB.prepare('INSERT OR IGNORE INTO chat_messages VALUES '+chunk.map(()=>'(?,?,?,?,?,?)').join(',')).bind(...chunk.flat()))}if(writes.length)await env.CHAT_DB.batch(writes);
 await env.CHAT_DB.prepare('INSERT OR IGNORE INTO chat_migrations VALUES(?,?)').bind(room,Date.now()).run();
}
export async function handleChat(request,env,{verify=verifyAccessUser,identity=chatIdentity,migrate=importLegacy}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/chats/'))return null;
 try{
  if(!env.CHAT_DB||!env.CHAT_ROOMS)throw fail('Chat temporalmente no disponible.',503);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw fail('Origen no permitido.');
  if(url.pathname==='/api/chats/socket'){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return reply({error:'Conexión no válida.'},400);
   const ticket=url.searchParams.get('ticket');if(!/^[a-f0-9]{64}$/.test(ticket||''))throw fail('Conexión caducada.',401);
   const row=await env.CHAT_DB.prepare('DELETE FROM chat_tickets WHERE id=? AND expires>? RETURNING room,context').bind(ticket,Date.now()).first();if(!row)throw fail('Conexión caducada.',401);
   return env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName(row.room)).fetch(new Request('https://room/socket',{headers:{Upgrade:'websocket','X-Chat-Context':row.context}}));
  }
  if(!['GET','POST'].includes(request.method))return reply({error:'Método no permitido.'},405);
  const uid=await verify(request),teamId=url.searchParams.get('team'),peerId=url.searchParams.get('peer')||null;
  if(!/^\d{1,20}$/.test(teamId||'')||peerId&&(!/^[A-Za-z0-9_-]{1,128}$/.test(peerId)||peerId===uid))throw fail('Chat no válido.',400);
  const profile=await identity(request,uid,teamId,peerId),db=env.CHAT_DB;
  if(url.pathname==='/api/chats/members'){
   if(request.method==='POST'){await db.prepare('INSERT INTO chat_people VALUES(?,?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name,role=excluded.role,updated_at=excluded.updated_at').bind(uid,profile.name,profile.role,Date.now()).run();
   await db.prepare('DELETE FROM chat_members WHERE uid=?').bind(uid).run();
   if(profile.teamIds.length)await db.batch(profile.teamIds.map(t=>db.prepare('INSERT OR IGNORE INTO chat_members VALUES(?,?)').bind(t,uid)));}
   const rows=await db.prepare('SELECT p.uid AS id,p.name,p.role FROM chat_people p JOIN chat_members m ON m.uid=p.uid WHERE m.team_id=? AND p.uid<>? ORDER BY p.name LIMIT 150').bind(teamId,uid).all();return reply({members:rows.results});
  }
  const room=roomKey(teamId,uid,peerId),stub=env.CHAT_ROOMS.get(env.CHAT_ROOMS.idFromName(room));
  if(url.pathname==='/api/chats/history'&&request.method==='GET'){
   await migrate(request,env,room,teamId,uid,peerId);
   const rows=await db.prepare('SELECT id,sender_id AS senderId,sender_name AS senderName,body,created_at AS createdAt FROM chat_messages WHERE room=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(room).all();return reply({messages:rows.results.reverse()});
  }
  if(url.pathname==='/api/chats/ticket'&&request.method==='POST'){
   const ticket=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''),context={uid,name:profile.name,room,expires:Date.now()+30000};
   await db.prepare('DELETE FROM chat_tickets WHERE expires<?').bind(Date.now()).run();await db.prepare('INSERT INTO chat_tickets VALUES(?,?,?,?)').bind(ticket,room,JSON.stringify(context),Date.now()+15000).run();return reply({ticket});
  }
  if(url.pathname==='/api/chats/send'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>10000)throw fail('Mensaje demasiado grande.',413);let data;try{data=JSON.parse(raw)}catch{throw fail('Mensaje no válido.',400)}
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(data?.id||''))throw fail('Mensaje no válido.',400);let body;try{body=core.messageText(data.body)}catch(e){throw fail(e.message,400)}
   return stub.fetch(new Request('https://room/send',{method:'POST',body:JSON.stringify({uid,name:profile.name,room,id:data.id,body})}));
  }
  return reply({error:'Ruta no disponible.'},404);
 }catch(e){return reply({error:e.status?e.message:'No se pudo conectar al chat.'},e.status||503)}
}
