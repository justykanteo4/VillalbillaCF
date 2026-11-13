const PENDING='villalbilla.visits.pending.v1',TOTAL='villalbilla.visits.total.v1';
function createVisitsClient({storage,request,randomId,platform}){
 let started=null,flushing=null,writes=Promise.resolve();
 const listeners=new Set(),separate=platform==='web'&&typeof storage.getAllKeys==='function'&&typeof storage.removeItem==='function',prefix='villalbilla.visits.event.v2.';
 const pending=async()=>separate?(await Promise.all((await storage.getAllKeys()).filter(key=>key.startsWith(prefix)).map(key=>read(key,null)))).filter(Boolean):read(PENDING,[]);
 const read=async(key,fallback)=>{const raw=await storage.getItem(key);try{return raw?JSON.parse(raw):fallback}catch{return fallback}};
 function serial(work){const result=writes.then(work);writes=result.catch(()=>{});return result}
 async function saveTotal(value){
  if(!Number.isSafeInteger(value?.total)||value.total<0)throw Error('Contador no válido.');
  return serial(async()=>{
   const previous=await read(TOTAL,null),next={total:Math.max(value.total,previous?.total||0),savedAt:new Date().toISOString()};
   await storage.setItem(TOTAL,JSON.stringify(next));
   listeners.forEach(listener=>listener(next));return next;
  });
 }
 function flush(){
  if(flushing)return flushing;
  flushing=(async()=>{
   for(;;){
    const events=await serial(pending);
    if(!events.length)return read(TOTAL,null);
    const batch=events.slice(0,50),ids=new Set(batch.map(event=>event.id));
    const result=await request('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:batch})});
    await saveTotal(result);
    await serial(async()=>{if(separate){await Promise.all(batch.map(event=>storage.removeItem(prefix+event.id)));return}const current=await read(PENDING,[]);await storage.setItem(PENDING,JSON.stringify(current.filter(event=>!ids.has(event.id))))});
   }
  })().finally(()=>{flushing=null});
  return flushing;
 }
 function start(){
  if(!['android','ios','web'].includes(platform))return Promise.resolve(null);
  if(!started)started=(async()=>{
   const id=await randomId();
   await serial(async()=>{if(separate){await storage.setItem(prefix+id,JSON.stringify({id,platform}));return}const events=await read(PENDING,[]);await storage.setItem(PENDING,JSON.stringify([...events,{id,platform}]))});
   await flush();
   // A foreground flush may have started before this opening was persisted.
   return flush();
  })();
  return started;
 }
 const getTotal=async()=>saveTotal(await request('/api/visits',{cache:'no-store'}));
 const resume=()=>{started=null;return start()};
 return {start,flush,resume,getTotal,readCached:async()=>{await writes;return read(TOTAL,null)},subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)}};
}
// Solo un regreso real desde segundo plano inicia otra visita; una interrupción
// de permisos (inactive), el enfoque de una ventana o una pantalla interna no.
function createVisitsLifecycle(client){let backgrounded=false;return state=>{if(state==='background')backgrounded=true;if(state==='active'&&backgrounded){backgrounded=false;return client.resume()}return Promise.resolve(null)}}
module.exports={createVisitsClient,createVisitsLifecycle};
