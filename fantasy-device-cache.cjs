// Copias privadas por cuenta. Los saldos y las operaciones siempre se validan en el servidor.
function createFantasyCache({read,save,now=Date.now}){
 const pending=new Map(),epochs=new Map();
 async function epoch(uid){if(!epochs.has(uid))epochs.set(uid,(await read('fantasy.private.version.'+uid).catch(()=>null))?.data?.at||0);return epochs.get(uid)}
 return async function cached(uid,path,options,fetcher){
  const method=options.method||'GET',version=await epoch(uid),key='fantasy.private.v1.'+uid+'.'+path,allowed=method==='GET'&&(/^\/leagues(?:$|\/[a-zA-Z0-9-]+\/(?:squad|market|search|alerts|lineup|table|transactions)(?:\?|$))/.test(path));
  if(!allowed){const result=await fetcher();if(method!=='GET'){const at=Math.max(now(),(epochs.get(uid)||0)+1);epochs.set(uid,at);await save('fantasy.private.version.'+uid,{at}).catch(()=>{})}return result}
  let copy=await read(key).catch(()=>null);if(copy&&Date.parse(copy.savedAt)<=version)copy=null;
  if(copy)options.onCached?.({...copy.data,fromCache:true});
  if(copy&&now()-Date.parse(copy.savedAt)>=0&&now()-Date.parse(copy.savedAt)<15000&&options.cache!=='reload')return {...copy.data,fromCache:true};
  const jobKey=key+'.'+version;
  if(!pending.has(jobKey)){const job=(async()=>{const data=await fetcher();if((epochs.get(uid)||0)===version)await save(key,data,new Date(Math.max(now(),version+1)).toISOString()).catch(()=>{});return data})().finally(()=>pending.delete(jobKey));pending.set(jobKey,job)}
  try{const data=await pending.get(jobKey);if((epochs.get(uid)||0)!==version)return cached(uid,path,{...options,cache:'reload'},fetcher);return data}catch(error){if(copy&&(!error.status||error.status>=500))return {...copy.data,fromCache:true,offline:true};throw error}
 }
}
module.exports={createFantasyCache};
