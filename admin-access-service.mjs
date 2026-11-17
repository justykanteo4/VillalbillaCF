// Private admin alerts use the existing D1 database and Expo delivery service.
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
export async function accessRequestProfile(request,uid){
 const r=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw fail('No se pudo comprobar la solicitud.',r.status===403?403:503);const document=await r.json();return {pending:document.fields?.status?.stringValue==='pending',revision:document.updateTime};
}
async function queueAdminRequests(db){await db.prepare("INSERT OR IGNORE INTO admin_access_jobs(event_id,subscription_id,admin_uid) SELECT e.id,s.id,a.uid FROM admin_access_events e CROSS JOIN access_admin_devices a JOIN access_push_tokens s ON s.id=a.token_id AND s.uid=a.uid AND s.enabled=1 WHERE e.resolved=0 AND e.created_at>=?").bind(Date.now()-7*86400000).run()}
export async function handleAdminAccess(request,env,ctx,{verifyUser,authorize,requestProfile=accessRequestProfile}={}){
 const path=new URL(request.url).pathname;if(!['/api/access/request','/api/access/admin-push','/api/access/push/remove','/api/access/request-target','/api/access/request-resolved'].includes(path))return null;
 try{
  if(request.method!=='POST')return reply({error:'Método no permitido.'},405);const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)throw fail('Origen no permitido.',403);
  const admin=['/api/access/admin-push','/api/access/request-target','/api/access/request-resolved'].includes(path),uid=admin?await authorize(request,env):await verifyUser(request),db=env.VISITS_DB;
  if(!db)throw fail('Servicio de accesos no disponible.',503);const raw=await request.text();if(raw.length>2000)throw fail('Solicitud demasiado grande.',413);let value;try{value=JSON.parse(raw)}catch{throw fail('Solicitud no válida.')}if(!value||typeof value!=='object')throw fail('Solicitud no válida.');
  if(path==='/api/access/admin-push'||path==='/api/access/push/remove'){
   if(!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value.token||''))throw fail('Dispositivo no válido.');const id=await digest(value.token);
   if(path.endsWith('/remove')){await db.prepare('DELETE FROM access_admin_devices WHERE token_id=? AND uid=?').bind(id,uid).run();await db.prepare('UPDATE access_push_tokens SET enabled=0 WHERE id=? AND uid=?').bind(id,uid).run();return reply({removed:true})}
   await db.prepare('INSERT INTO access_push_tokens(id,uid,token,enabled,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET uid=excluded.uid,token=excluded.token,enabled=1,updated_at=excluded.updated_at').bind(id,uid,value.token,Date.now()).run();
   await db.prepare('INSERT INTO access_admin_devices VALUES(?,?,?) ON CONFLICT(token_id) DO UPDATE SET uid=excluded.uid,updated_at=excluded.updated_at').bind(id,uid,Date.now()).run();await queueAdminRequests(db);ctx?.waitUntil?.(dispatchAdminAccessNotifications(env));return reply({registered:true});
  }
  if(path==='/api/access/request-target'){
   if(!/^[a-f0-9]{64}$/.test(value.requestId||''))throw fail('Aviso no válido.');const event=await db.prepare('SELECT uid,revision,resolved FROM admin_access_events WHERE id=?').bind(value.requestId).first();if(!event||event.resolved)return reply({pending:false});const current=await requestProfile(request,event.uid);return reply(current.pending&&current.revision===event.revision?{pending:true,uid:event.uid}:{pending:false});
  }
  const target=value.uid||uid;if(!/^[A-Za-z0-9_-]{1,128}$/.test(target))throw fail('Cuenta no válida.');if(!admin&&target!==uid)await authorize(request,env);const current=await requestProfile(request,target);
  if(path==='/api/access/request-resolved'){
   if(current.pending)throw fail('La solicitud sigue pendiente.',409);await db.prepare('UPDATE admin_access_events SET resolved=1 WHERE uid=?').bind(target).run();await db.prepare("UPDATE admin_access_jobs SET status='cancelled' WHERE event_id IN(SELECT id FROM admin_access_events WHERE uid=?) AND status='pending'").bind(target).run();return reply({resolved:true});
  }
  if(!current.pending||typeof current.revision!=='string'||!current.revision)throw fail('La cuenta no tiene una solicitud pendiente.',409);
  const id=await digest(target+':'+current.revision),existing=await db.prepare('SELECT id FROM admin_access_events WHERE id=?').bind(id).first();if(!existing){const rate=await db.prepare('SELECT COUNT(*) n FROM admin_access_events WHERE uid=? AND created_at>?').bind(target,Date.now()-600000).first();if(rate.n>=3)return reply({queued:false,limited:true});await db.prepare('INSERT OR IGNORE INTO admin_access_events VALUES(?,?,?,?,0)').bind(id,target,current.revision,Date.now()).run()}
  await queueAdminRequests(db);ctx?.waitUntil?.(dispatchAdminAccessNotifications(env));return reply({queued:true,requestId:id});
 }catch(e){return reply({error:e.status?e.message:'No se pudo preparar el aviso de acceso.'},e.status||503)}
}
export async function dispatchAdminAccessNotifications(env,{send=fetch}={}){
 const db=env.VISITS_DB;if(!db)return;
 await db.prepare("UPDATE admin_access_jobs SET status='pending' WHERE status='sending' AND claimed_at<?").bind(Date.now()-120000).run();
 const jobs=await db.prepare("SELECT j.event_id,j.subscription_id,j.admin_uid,s.token FROM admin_access_jobs j JOIN admin_access_events e ON e.id=j.event_id AND e.resolved=0 JOIN access_admin_devices a ON a.token_id=j.subscription_id AND a.uid=j.admin_uid JOIN access_push_tokens s ON s.id=a.token_id AND s.uid=a.uid AND s.enabled=1 WHERE j.status='pending' AND j.attempts<5 AND j.next_at<=? LIMIT 5").bind(Date.now()).all();
 for(const job of jobs.results){const claim=await db.prepare("UPDATE admin_access_jobs SET status='sending',claimed_at=?,attempts=attempts+1 WHERE event_id=? AND subscription_id=? AND admin_uid=? AND status='pending'").bind(Date.now(),job.event_id,job.subscription_id,job.admin_uid).run();if(!claim.meta?.changes)continue;
  try{const r=await send('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:job.token,title:'Nueva solicitud de acceso',body:'Tienes una solicitud pendiente. Pulsa para revisarla y aceptar o rechazar el acceso.',sound:'default',priority:'high',channelId:'club',data:{accessRequest:true,requestId:job.event_id}}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Push unavailable');const data=(await r.json()).data;if(data?.status!=='ok'){if(data?.details?.error==='DeviceNotRegistered')await db.prepare('UPDATE access_push_tokens SET enabled=0 WHERE id=?').bind(job.subscription_id).run();throw Error('Push rejected')}await db.prepare("UPDATE admin_access_jobs SET status='accepted',ticket=? WHERE event_id=? AND subscription_id=? AND admin_uid=?").bind(data.id||null,job.event_id,job.subscription_id,job.admin_uid).run()
  }catch{await db.prepare("UPDATE admin_access_jobs SET status='pending',next_at=? WHERE event_id=? AND subscription_id=? AND admin_uid=?").bind(Date.now()+60000,job.event_id,job.subscription_id,job.admin_uid).run()}
 }
 await db.prepare('DELETE FROM admin_access_jobs WHERE event_id IN(SELECT id FROM admin_access_events WHERE created_at<?)').bind(Date.now()-30*86400000).run();await db.prepare('DELETE FROM admin_access_events WHERE created_at<?').bind(Date.now()-30*86400000).run();
}
