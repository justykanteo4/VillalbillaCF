import {verifyAdmin} from './free-notifications.mjs';

const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function handleKidsSettings(request,env,{authorize=verifyAdmin}={}){
 const url=new URL(request.url);
 if(url.pathname!=='/api/kids/settings'&&url.pathname!=='/api/admin/kids/settings')return null;
 const admin=url.pathname==='/api/admin/kids/settings';
 if(request.method!=='GET'&&!(admin&&request.method==='POST'))return reply({error:'Método no permitido.'},405);
 if(!env.CHAT_DB)return reply({error:'Configuración temporalmente no disponible.'},503);
 try{
  if(admin)await authorize(request,env);
  if(request.method==='POST'){
   const origin=request.headers.get('Origin');
   if(origin&&origin!==url.origin)return reply({error:'Origen no permitido.'},403);
   const raw=await request.text();
   if(raw.length>500)return reply({error:'Solicitud demasiado grande.'},413);
   let value;try{value=JSON.parse(raw)}catch{return reply({error:'Solicitud inválida.'},400)}
   if(typeof value?.enabled!=='boolean'||!Number.isSafeInteger(value.revision)||value.revision<1)return reply({error:'Configuración inválida.'},400);
   const result=await env.CHAT_DB.prepare('UPDATE club_kids_settings SET enabled=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=1 AND revision=?')
    .bind(value.enabled?1:0,Date.now(),'admin',value.revision).run();
   if(!result.meta?.changes)return reply({error:'Otro administrador ha cambiado el ajuste. Actualiza antes de guardar.'},409);
  }
  const row=await env.CHAT_DB.prepare('SELECT enabled,revision,updated_at AS updatedAt FROM club_kids_settings WHERE id=1').first();
  if(!row)return reply({error:'El ajuste KIDS aún no está inicializado.'},503);
  return reply({enabled:row.enabled===1,revision:row.revision,updatedAt:row.updatedAt});
 }catch(e){return reply({error:e.status?e.message:'El ajuste KIDS todavía no está disponible.'},e.status||503)}
}
