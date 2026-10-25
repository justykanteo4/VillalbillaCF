import {createRemoteJWKSet,jwtVerify} from 'jose';
import webpush from 'web-push';

const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const ADMIN_EMAILS=['albaresfernandez@gmail.com','appvillalbilla@gmail.com'];
export const FREE_LIMITS={subscriptions:1000,noticesPerDay:20,batch:10};
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const error=(message,status=400)=>Object.assign(Error(message),{status});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
export function validWebSubscription(value){
 try{
  const u=new URL(value?.endpoint);
  const allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||/(^|\.)notify\.windows\.com$/.test(u.hostname);
  return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&allowed&&u.href.length<4096&&/^[A-Za-z0-9_-]{87}$/.test(value.keys?.p256dh||'')&&/^[A-Za-z0-9_-]{22}$/.test(value.keys?.auth||'');
 }catch{return false}
}
const ids=value=>Array.isArray(value)&&value.length<=100&&value.every(id=>typeof id==='string'&&/^\d{1,20}$/.test(id));
export function validateNotice(value){
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>120||typeof value.body!=='string'||!value.body.trim()||value.body.length>2000)throw error('Escribe un título y mensaje válidos.');
 if(typeof value.all!=='boolean'||!ids(value.teamIds)||!ids(value.playerIds)||(!value.all&&!value.teamIds.length&&!value.playerIds.length))throw error('Selecciona los destinatarios.');
 return {...value,title:value.title.trim(),body:value.body.trim()};
}
export async function verifyAdmin(request,env){
 const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw error('Inicia sesión como administrador.',401);
 let payload;try{({payload}=await jwtVerify(token,googleKeys,{issuer:'https://securetoken.google.com/villalbillacf',audience:'villalbillacf',algorithms:['RS256']}))}catch{throw error('La sesión no es válida. Vuelve a iniciar sesión.',401)}
 if(!payload.email_verified||!payload.email)throw error('Necesitas una cuenta verificada.',403);
 if(!ADMIN_EMAILS.includes(payload.email.toLowerCase())){
  // Firestore applies the existing clubAdmins rules to this user's ID token.
  const r=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/clubAdmins/'+encodeURIComponent(payload.email.toLowerCase()),{headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw error('Acceso reservado a administradores.',403);
 }
 return payload.sub;
}
async function body(request){
 const raw=await request.text();if(raw.length>16000)throw error('Solicitud demasiado grande.',413);
 try{return JSON.parse(raw)}catch{throw error('Solicitud no válida.')}
}
export async function handleFreeNotifications(request,env,ctx){
 const url=new URL(request.url),path=url.pathname,db=env.NOTIFICATIONS_DB;
 if(!path.startsWith('/api/push/')&&path!=='/api/notifications')return null;
 if(!db)return reply({error:'El servicio de avisos no está configurado.'},503);
 try{
  if(path==='/api/push/key'&&request.method==='GET')return reply({publicKey:env.WEB_PUSH_PUBLIC_KEY||null,free:true});
  if(path==='/api/notifications'&&request.method==='GET'){
   const rows=await db.prepare('SELECT * FROM club_notices ORDER BY created_at DESC LIMIT 100').all();
   return reply({messages:rows.results.map(row=>({id:row.id,title:row.title,body:row.body,all:!!row.all_club,teamIds:JSON.parse(row.team_ids),playerIds:JSON.parse(row.player_ids),createdAt:new Date(row.created_at).toISOString()}))});
  }
  if(request.method!=='POST')return reply({error:'Método no permitido.'},405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)throw error('Origen no permitido.',403);
  if(path==='/api/push/subscription'){
   const value=await body(request);
   if(!/^[a-f0-9]{64}$/.test(value.installationKey||''))throw error('Identificador de dispositivo no válido.');
   const id=await hash(value.installationKey);
   if(value.enabled===false){await db.prepare('UPDATE push_subscriptions SET enabled=0,updated_at=? WHERE id=?').bind(Date.now(),id).run();return reply({enabled:false})}
   if(!ids(value.teamIds)||!ids(value.playerIds))throw error('Selección no válida.');
   if(value.provider==='web'){
    if(!validWebSubscription(value.subscription))throw error('El navegador no ha proporcionado una suscripción válida.');
   }else if(value.provider!=='expo'||!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value.token||''))throw error('Dispositivo no válido.');
   const destination=await hash(value.provider==='web'?value.subscription.endpoint:value.token);
   const payload=JSON.stringify(value.provider==='web'?value.subscription:{token:value.token});
   const count=await db.prepare('SELECT count(*) AS n FROM push_subscriptions WHERE enabled=1 AND id<>? AND destination<>?').bind(id,destination).first();
   if(count.n>=FREE_LIMITS.subscriptions)throw error('Se ha alcanzado el límite gratuito de dispositivos. Puedes seguir leyendo los avisos dentro de la app.',429);
   const saved=await db.batch([
    db.prepare('UPDATE push_subscriptions SET enabled=0 WHERE destination=? AND id<>?').bind(destination,id),
    db.prepare('INSERT INTO push_subscriptions(id,destination,provider,payload,team_ids,player_ids,enabled,updated_at) SELECT ?,?,?,?,?,?,1,? WHERE (SELECT count(*) FROM push_subscriptions WHERE enabled=1 AND id<>?)<? ON CONFLICT(id) DO UPDATE SET destination=excluded.destination,provider=excluded.provider,payload=excluded.payload,team_ids=excluded.team_ids,player_ids=excluded.player_ids,enabled=1,updated_at=excluded.updated_at WHERE destination<>excluded.destination OR payload<>excluded.payload OR team_ids<>excluded.team_ids OR player_ids<>excluded.player_ids OR enabled<>1').bind(id,destination,value.provider,payload,JSON.stringify(value.teamIds),JSON.stringify(value.playerIds),Date.now(),id,FREE_LIMITS.subscriptions)
   ]);
   if(!saved[1].meta.changes){
    const existing=await db.prepare('SELECT enabled FROM push_subscriptions WHERE id=?').bind(id).first();
    if(!existing?.enabled)throw error('Se ha alcanzado el límite gratuito de dispositivos. Puedes seguir leyendo los avisos dentro de la app.',429);
   }
   return reply({enabled:true});
  }
  const uid=await verifyAdmin(request,env);
  if(path==='/api/push/dispatch'){
   const result=await dispatchPending(env);return reply(result);
  }
  if(path!=='/api/push/send')throw error('Ruta no encontrada.',404);
  const value=validateNotice(await body(request)),id=crypto.randomUUID(),now=Date.now();
  const inserted=await db.prepare('INSERT INTO club_notices(id,title,body,all_club,team_ids,player_ids,created_by,created_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM club_notices WHERE created_at>=?)<?').bind(id,value.title,value.body,value.all?1:0,JSON.stringify(value.teamIds),JSON.stringify(value.playerIds),uid,now,now-86400000,FREE_LIMITS.noticesPerDay).run();
  if(!inserted.meta.changes)throw error('Has alcanzado los 20 avisos diarios del modo gratuito. Inténtalo mañana.',429);
  await queueNotice(db,id);
  ctx.waitUntil(dispatchPending(env));
  return reply({id,published:true,queued:true});
 }catch(e){return reply({error:e.status?e.message:'No se pudo completar la operación. Inténtalo de nuevo.'},e.status||503)}
}
export async function queueNotice(db,id){
 await db.prepare(`INSERT OR IGNORE INTO push_outbox(notice_id,subscription_id)
 SELECT n.id,s.id FROM club_notices n JOIN push_subscriptions s ON s.enabled=1
 WHERE n.id=? AND (n.all_club=1
 OR EXISTS(SELECT 1 FROM json_each(n.team_ids) a JOIN json_each(s.team_ids) b ON a.value=b.value)
 OR EXISTS(SELECT 1 FROM json_each(n.player_ids) a JOIN json_each(s.player_ids) b ON a.value=b.value))`).bind(id).run();
 await db.prepare('UPDATE club_notices SET queued=1 WHERE id=?').bind(id).run();
}
export async function dispatchPending(env){
 const db=env.NOTIFICATIONS_DB,now=Date.now();if(!db)return {pending:0};
 // Repair a notice whose publication succeeded but whose queue creation was interrupted.
 const recent=await db.prepare('SELECT id FROM club_notices WHERE queued=0 AND created_at>? ORDER BY created_at DESC LIMIT 20').bind(now-86400000).all();
 for(const row of recent.results)await queueNotice(db,row.id);
 await db.prepare("UPDATE push_outbox SET status='pending' WHERE status='sending' AND next_at<=?").bind(now).run();
 const jobs=await db.prepare(`SELECT o.*,n.title,n.body,s.provider,s.payload FROM push_outbox o
 JOIN club_notices n ON n.id=o.notice_id JOIN push_subscriptions s ON s.id=o.subscription_id
 WHERE o.status='pending' AND o.next_at<=? AND o.attempts<5 AND s.enabled=1
 ORDER BY o.next_at LIMIT ?`).bind(now,FREE_LIMITS.batch).all();
 for(const job of jobs.results){
  const claimed=await db.prepare("UPDATE push_outbox SET status='sending',attempts=attempts+1,next_at=? WHERE notice_id=? AND subscription_id=? AND status IN ('pending','sending') AND next_at<=?").bind(now+120000,job.notice_id,job.subscription_id,now).run();
  if(!claimed.meta.changes)continue;
  try{
   const subscription=JSON.parse(job.payload);let ticket=null;
   if(job.provider==='web'){
    if(!env.WEB_PUSH_PRIVATE_KEY||!env.WEB_PUSH_PUBLIC_KEY)throw Error('Push no configurado');
    const details=webpush.generateRequestDetails(subscription,JSON.stringify({title:job.title,body:job.body,id:job.notice_id}),{TTL:86400,contentEncoding:'aes128gcm',vapidDetails:{subject:'mailto:appvillalbilla@gmail.com',publicKey:env.WEB_PUSH_PUBLIC_KEY,privateKey:env.WEB_PUSH_PRIVATE_KEY}});
    const response=await fetch(details.endpoint,{method:details.method,headers:details.headers,body:details.body,signal:AbortSignal.timeout(10000)});
    if([404,410].includes(response.status))throw Object.assign(Error('Dispositivo dado de baja'),{expired:true});
    if(!response.ok)throw Error('El proveedor rechazó el envío ('+response.status+')');
   }else{
    const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:subscription.token,title:job.title,body:job.body,sound:'default',channelId:'club',data:{notificationId:job.notice_id}}),signal:AbortSignal.timeout(10000)});
    const result=await response.json();if(!response.ok||result.data?.status!=='ok')throw Object.assign(Error('Expo rechazó el envío'),{expired:result.data?.details?.error==='DeviceNotRegistered'});ticket=result.data.id;
   }
   await db.prepare("UPDATE push_outbox SET status='accepted',ticket=?,last_error=NULL WHERE notice_id=? AND subscription_id=?").bind(ticket,job.notice_id,job.subscription_id).run();
  }catch(e){
   if(e.expired)await db.prepare('UPDATE push_subscriptions SET enabled=0 WHERE id=?').bind(job.subscription_id).run();
   await db.prepare('UPDATE push_outbox SET status=?,next_at=?,last_error=? WHERE notice_id=? AND subscription_id=?').bind(e.expired||job.attempts>=4?'failed':'pending',now+60000*(job.attempts+1),String(e.message).slice(0,150),job.notice_id,job.subscription_id).run();
  }
 }
 const count=await db.prepare("SELECT 1 AS n FROM push_outbox o JOIN push_subscriptions s ON s.id=o.subscription_id WHERE o.status IN ('pending','sending') AND o.attempts<5 AND s.enabled=1 LIMIT 1").first();
 return {pending:count?.n||0,processed:jobs.results.length};
}
export async function scheduledNotifications(env){
 await dispatchPending(env);
 const db=env.NOTIFICATIONS_DB,cutoff=Date.now()-30*86400000;
 const jobs=await db.prepare("SELECT notice_id,subscription_id,ticket FROM push_outbox WHERE status='accepted' AND ticket IS NOT NULL LIMIT 100").all();
 if(jobs.results.length){
  const response=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:jobs.results.map(row=>row.ticket)})});
  if(response.ok){const receipts=(await response.json()).data||{};for(const job of jobs.results){const receipt=receipts[job.ticket];if(!receipt)continue;await db.prepare('UPDATE push_outbox SET status=? WHERE notice_id=? AND subscription_id=?').bind(receipt.status==='ok'?'delivered':'failed',job.notice_id,job.subscription_id).run();if(receipt.details?.error==='DeviceNotRegistered')await db.prepare('UPDATE push_subscriptions SET enabled=0 WHERE id=?').bind(job.subscription_id).run()}}
 }
 await db.batch([db.prepare('DELETE FROM push_outbox WHERE notice_id IN (SELECT id FROM club_notices WHERE created_at<?)').bind(cutoff),db.prepare('DELETE FROM club_notices WHERE created_at<?').bind(cutoff),db.prepare('DELETE FROM push_subscriptions WHERE enabled=0 AND updated_at<?').bind(cutoff)]);
}
