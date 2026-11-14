// Copias privadas por cuenta. Los saldos y las operaciones siempre se validan en el servidor.
function createFantasyCache({read,save,now=Date.now}){
 const pending=new Map(),epochs=new Map(),copies=new Map(),reads=new Map();
 async function stored(key){if(copies.has(key))return copies.get(key);if(!reads.has(key))reads.set(key,Promise.resolve().then(()=>read(key)).catch(()=>null).then(value=>{if(!copies.has(key))copies.set(key,value);return copies.get(key)}).finally(()=>reads.delete(key)));return reads.get(key)}
 async function persist(key,data,savedAt){copies.set(key,{data,savedAt:savedAt||new Date(now()).toISOString()});await save(key,data,savedAt).catch(()=>{})}
 const versionKey=(uid,identity)=>identity?'fantasy.private.access.version.'+uid:'fantasy.private.version.'+uid;
 async function epoch(uid,identity=false){const key=versionKey(uid,identity);if(!epochs.has(key)){let value=(await stored(key))?.data?.at;if(value==null&&identity){value=await epoch(uid);await persist(key,{at:value})}if(!epochs.has(key))epochs.set(key,value||0)}return epochs.get(key)}
 async function invalidate(uid,identity=false){const key=versionKey(uid,identity),at=Math.max(now(),(await epoch(uid,identity))+1);epochs.set(key,at);await persist(key,{at})}
 async function revoke(uid){await invalidate(uid);await invalidate(uid,true)}
 return async function cached(uid,path,options,fetcher){
  const method=options.method||'GET',identity=path==='/preview',version=await epoch(uid,identity),vkey=versionKey(uid,identity),key='fantasy.private.v1.'+uid+'.'+path+(options.scope?'#'+encodeURIComponent(options.scope):''),allowed=method==='GET'&&(identity||/^\/leagues(?:$|\/[a-zA-Z0-9-]+\/(?:squad|market|search|alerts|lineup|table|transactions|coaches|players)(?:\?|$))/.test(path));
  if(!allowed){try{const result=await fetcher();if(method!=='GET'){if(path==='/admin/access')await revoke(uid);else await invalidate(uid)}return result}catch(error){if(error.status===401||error.status===403)await revoke(uid);throw error}}
  let copy=await stored(key),directoryOnly=false;if(copy&&Date.parse(copy.savedAt)<=version){if(path==='/leagues'&&Array.isArray(copy.data?.leagues)&&Date.parse(copy.savedAt)>await epoch(uid,true)){directoryOnly=true;copy={...copy,data:{...copy.data,leagues:copy.data.leagues.map(({finance,...league})=>league)}}}else copy=null;}
  if(copy)options.onCached?.({...copy.data,fromCache:true});
  if(copy&&!directoryOnly&&now()-Date.parse(copy.savedAt)>=0&&now()-Date.parse(copy.savedAt)<15000&&options.cache!=='reload')return {...copy.data,fromCache:true};
  const jobKey=key+'.'+version;
  if(!pending.has(jobKey)){const job=(async()=>{const data=await fetcher();if((epochs.get(vkey)||0)===version)await persist(key,data,new Date(Math.max(now(),version+1)).toISOString());return data})().finally(()=>pending.delete(jobKey));pending.set(jobKey,job)}
  try{const data=await pending.get(jobKey);if((epochs.get(vkey)||0)!==version)return cached(uid,path,{...options,cache:'reload'},fetcher);return data}catch(error){if(error.status===401||error.status===403)await revoke(uid);if(copy&&(!error.status||error.status>=500))return {...copy.data,fromCache:true,offline:true};throw error}
 }
}
module.exports={createFantasyCache};
