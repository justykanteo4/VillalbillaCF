import {verifyAdmin} from './free-notifications.mjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function handleActivity(request,env,{authorize=verifyAdmin}={}){
 const url=new URL(request.url);if(!['/api/activity','/api/admin/usage'].includes(url.pathname))return null;
 try{
  if(url.pathname==='/api/admin/usage'){
   await authorize(request,env);if(request.method!=='GET')return reply({error:'Método no permitido.'},405);
   if(!env.VISITS_DB)return reply({error:'Estadísticas no disponibles.'},503);
   const rows=await env.VISITS_DB.prepare('SELECT role,COUNT(*) AS sessions,COUNT(DISTINCT device_id) AS devices,COUNT(DISTINCT CASE WHEN last_seen>=? THEN device_id END) AS active FROM app_activity_sessions GROUP BY role').bind(Date.now()-300000).all();
   return reply({roles:rows.results,checkedAt:new Date().toISOString()});
  }
  if(request.method!=='POST')return reply({error:'Método no permitido.'},405);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return reply({error:'Origen no permitido.'},403);
  const raw=await request.text();if(raw.length>1000)return reply({error:'Solicitud demasiado grande.'},413);
  let value;try{value=JSON.parse(raw)}catch{return reply({error:'Solicitud no válida.'},400)}
  if(!value||!['trainer','player','fan'].includes(value.role)||!['id','deviceId'].every(k=>/^[a-f0-9]{64}$/.test(value[k])))return reply({error:'Actividad no válida.'},400);
  if(!env.VISITS_DB)return reply({error:'Estadísticas no disponibles.'},503);
  await env.VISITS_DB.prepare('INSERT INTO app_activity_sessions(id,device_id,role,started_at,last_seen) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET role=excluded.role,last_seen=excluded.last_seen WHERE device_id=excluded.device_id').bind(value.id,value.deviceId,value.role,Date.now(),Date.now()).run();
  return reply({saved:true});
 }catch(e){return reply({error:e.status?e.message:'No se pudieron consultar las estadísticas.'},e.status||503)}
}
