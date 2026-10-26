const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function handleVisits(request,env){
 const url=new URL(request.url);
 if(url.pathname!=='/api/visits')return null;
 const db=env.VISITS_DB;
 if(!db)return reply({error:'El contador de visitas aún no está disponible.'},503);
 try{
  if(request.method==='GET'){
   const row=await db.prepare('SELECT total FROM apk_visit_totals WHERE id=1').first();
   if(!row)throw Error('missing counter');
   return reply({total:row.total});
  }
  if(request.method!=='POST')return reply({error:'Método no permitido.'},405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin)return reply({error:'Origen no permitido.'},403);
  const raw=await request.text();
  if(raw.length>12000)return reply({error:'Solicitud demasiado grande.'},413);
  let body;try{body=JSON.parse(raw)}catch{return reply({error:'Solicitud no válida.'},400)}
  if(!Array.isArray(body.events)||!body.events.length||body.events.length>50||body.events.some(event=>!event||!/^[a-f0-9]{64}$/.test(event.id)||!['android','ios'].includes(event.platform)))return reply({error:'Visitas no válidas.'},400);
  const events=[...new Map(body.events.map(event=>[event.id,event])).values()];
  const results=await db.batch([
   ...events.map(event=>db.prepare('INSERT OR IGNORE INTO apk_visit_events(id,platform,created_at) VALUES(?,?,?)').bind(event.id,event.platform,Date.now())),
   db.prepare('SELECT total FROM apk_visit_totals WHERE id=1'),
  ]);
  const total=results.at(-1)?.results?.[0]?.total;
  if(!Number.isSafeInteger(total)||total<0)throw Error('missing counter');
  return reply({total});
 }catch{return reply({error:'No se pudo consultar el contador. Inténtalo más tarde.'},503)}
}
