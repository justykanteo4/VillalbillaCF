const PENDING='villalbilla.visits.pending.v1',TOTAL='villalbilla.visits.total.v1';
function createVisitsClient({storage,request,randomId,platform}){
 let started=null,flushing=null,writes=Promise.resolve();
 const listeners=new Set();
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
    const events=await serial(()=>read(PENDING,[]));
    if(!events.length)return read(TOTAL,null);
    const batch=events.slice(0,50),ids=new Set(batch.map(event=>event.id));
    const result=await request('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:batch})});
    await saveTotal(result);
    await serial(async()=>{const current=await read(PENDING,[]);await storage.setItem(PENDING,JSON.stringify(current.filter(event=>!ids.has(event.id))))});
   }
  })().finally(()=>{flushing=null});
  return flushing;
 }
 function start(){
  if(!['android','ios'].includes(platform))return Promise.resolve(null);
  if(!started)started=(async()=>{
   const id=await randomId();
   await serial(async()=>{const events=await read(PENDING,[]);await storage.setItem(PENDING,JSON.stringify([...events,{id,platform}]))});
   await flush();
   // A foreground flush may have started before this opening was persisted.
   return flush();
  })();
  return started;
 }
 const getTotal=async()=>saveTotal(await request('/api/visits',{cache:'no-store'}));
 const resume=async idleMs=>{if(['android','ios'].includes(platform)&&Number.isFinite(idleMs)&&idleMs>=30*60*1000){started=null;return start()}await flush();return getTotal()};
 return {start,flush,resume,getTotal,readCached:async()=>{await writes;return read(TOTAL,null)},subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)}};
}
module.exports={createVisitsClient};
