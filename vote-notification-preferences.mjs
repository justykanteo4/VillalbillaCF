const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleVoteNotificationPreferences(request,env,{authorize,now=Date.now()}={}){
 const url=new URL(request.url);if(url.pathname!=='/api/access/vote-notifications')return null;
 try{
  if(!['GET','POST'].includes(request.method))return reply({error:'Método no permitido.'},405);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return reply({error:'Origen no permitido.'},403);
  const uid=await authorize(request,env),db=env.VISITS_DB;if(!db)return reply({error:'No se pudieron cargar las preferencias.'},503);
  if(request.method==='GET'){const row=await db.prepare('SELECT enabled FROM vote_notification_preferences WHERE uid=?').bind(uid).first();return reply({enabled:row?.enabled!==0})}
  const raw=await request.text();if(raw.length>500)return reply({error:'Solicitud demasiado grande.'},413);let data;try{data=JSON.parse(raw)}catch{return reply({error:'Solicitud no válida.'},400)}
  if(typeof data?.enabled!=='boolean')return reply({error:'Indica si quieres recibir los avisos de votos.'},400);
  // Preserve the cutoff on an idempotent save: only an actual toggle starts a new period.
  await db.prepare('INSERT INTO vote_notification_preferences(uid,enabled,updated_at) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at WHERE enabled!=excluded.enabled').bind(uid,data.enabled?1:0,now).run();return reply({enabled:data.enabled});
 }catch(e){return reply({error:e.status?e.message:'No se pudieron guardar las preferencias.'},e.status||503)}
}
