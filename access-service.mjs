import {createRemoteJWKSet,jwtVerify} from 'jose';
import {verifyAdmin} from './free-notifications.mjs';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const error=(message,status=400)=>Object.assign(Error(message),{status});
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function verifyAccessUser(request){const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)throw error('Inicia sesión.',401);try{const {payload}=await jwtVerify(token,keys,{issuer:'https://securetoken.google.com/villalbillacf',audience:'villalbillacf',algorithms:['RS256']});return payload.sub}catch{throw error('La sesión no es válida.',401)}}
async function approvedProfile(request,uid){const response=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(15000)});if(!response.ok)throw error('No se pudo confirmar la aprobación.',response.status===403?403:503);const fields=(await response.json()).fields,notice=fields?.accessNotice?.mapValue?.fields;if(fields?.status?.stringValue!=='approved'||!notice?.id?.stringValue)throw error('La solicitud todavía no está aprobada.',409);return {id:notice.id.stringValue,title:notice.title?.stringValue||'Acceso aceptado',body:notice.body?.stringValue||'Ya puedes acceder a tu espacio del club.'}}
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
async function queue(db,uid,noticeId){await db.prepare("INSERT OR IGNORE INTO access_push_jobs(notice_id,subscription_id) SELECT n.id,s.id FROM access_notice_events n JOIN access_push_tokens s ON n.uid=s.uid AND s.enabled=1 WHERE n.uid=? AND n.id=? AND n.created_at>=?").bind(uid,uid+':'+noticeId,Date.now()-7*86400000).run()}
export async function handleAccess(request,env,ctx,{verifyUser=verifyAccessUser,authorize=verifyAdmin,profile=approvedProfile}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/access/'))return null;
 try{
  if(request.method!=='POST')return reply({error:'Método no permitido.'},405);const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return reply({error:'Origen no permitido.'},403);
  if(!['/api/access/push','/api/access/notify'].includes(url.pathname))return reply({error:'Servicio no encontrado.'},404);
  const uid=url.pathname==='/api/access/push'?await verifyUser(request):await authorize(request,env);
  const raw=await request.text();if(raw.length>2000)throw error('Solicitud demasiado grande.',413);let value;try{value=JSON.parse(raw)}catch{throw error('Solicitud no válida.')}
  const db=env.VISITS_DB;if(!db)throw error('Servicio de confirmaciones no disponible.',503);
  if(url.pathname==='/api/access/push'){
   if(!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value?.token||''))throw error('Dispositivo no válido.');
   const id=await hash(value.token);await db.prepare('INSERT INTO access_push_tokens(id,uid,token,enabled,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET uid=excluded.uid,token=excluded.token,enabled=1,updated_at=excluded.updated_at').bind(id,uid,value.token,Date.now()).run();try{const approved=await profile(request,uid);await queue(db,uid,approved.id)}catch(e){if(e.status===409)await db.prepare("UPDATE access_push_jobs SET status='cancelled' WHERE subscription_id=? AND status='pending'").bind(id).run()}return reply({registered:true});
  }
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(value?.uid||''))throw error('Cuenta no válida.');const approved=await profile(request,value.uid),id=value.uid+':'+approved.id;
  await db.prepare('INSERT OR IGNORE INTO access_notice_events(id,uid,title,body,created_at) VALUES(?,?,?,?,?)').bind(id,value.uid,approved.title,approved.body,Date.now()).run();await queue(db,value.uid,approved.id);
  ctx?.waitUntil?.(dispatchAccessNotifications(env));return reply({queued:true,noticeId:approved.id});
 }catch(e){return reply({error:e.status?e.message:'No se pudo preparar la confirmación.'},e.status||503)}
}
export async function dispatchAccessNotifications(env,{send=fetch}={}){
 const db=env.VISITS_DB;if(!db)return;
 await db.prepare("UPDATE access_push_jobs SET status='pending' WHERE status='sending' AND claimed_at<?").bind(Date.now()-120000).run();
 const jobs=await db.prepare("SELECT j.*,n.title,n.body,s.token FROM access_push_jobs j JOIN access_notice_events n ON n.id=j.notice_id JOIN access_push_tokens s ON s.id=j.subscription_id AND s.uid=n.uid WHERE j.status='pending' AND j.attempts<5 AND j.next_at<=? AND s.enabled=1 LIMIT 5").bind(Date.now()).all();
 for(const job of jobs.results){const claimed=await db.prepare("UPDATE access_push_jobs SET status='sending',claimed_at=?,attempts=attempts+1 WHERE notice_id=? AND subscription_id=? AND status='pending'").bind(Date.now(),job.notice_id,job.subscription_id).run();if(!claimed.meta?.changes)continue;
  try{const r=await send('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:job.token,title:job.title,body:job.body,sound:'default',channelId:'club',data:{accessAccepted:true}}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Push unavailable');const data=(await r.json()).data;if(data?.status!=='ok'){if(data?.details?.error==='DeviceNotRegistered'){await db.prepare('UPDATE access_push_tokens SET enabled=0 WHERE id=?').bind(job.subscription_id).run()}throw Error('Push rejected')}
   await db.prepare("UPDATE access_push_jobs SET status='accepted',ticket=? WHERE notice_id=? AND subscription_id=?").bind(data.id||null,job.notice_id,job.subscription_id).run();
  }catch{await db.prepare("UPDATE access_push_jobs SET status='pending',next_at=? WHERE notice_id=? AND subscription_id=?").bind(Date.now()+60000,job.notice_id,job.subscription_id).run()}
 }
}
