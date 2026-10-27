import {readCopy,saveCopy} from './offline';
import {sumGoalkeepers} from './goalkeeper-stats.cjs';
import {Platform} from 'react-native';
export const apiBase=Platform.OS==='web'?'':(process.env.EXPO_PUBLIC_API_URL||'');
const PUBLIC_DATA=/^\/api\/(?:news|report-membership|team-calendar|team-minutes|goalkeepers|club-stats|instagram|calendar|standings|scorers|league-scorers|players|team-roster|team-ranking|team-staff|player-minutes|match|sanctions|field|weather|notifications)(?:\?|$)/;
const refreshing=new Map(),versions=new Map(),MAX_AGE=60000;
const limitData=(path,data)=>path.split('?')[0]==='/api/instagram'?{...data,posts:(Array.isArray(data.posts)?data.posts:[]).slice(0,8)}:data;
async function baseApi(path,options={}){
 if(Platform.OS!=='web'&&!apiBase)throw Error('Servicio pendiente de configurar para móvil');
 if(options.signal?.aborted)throw Object.assign(Error('Consulta cancelada'),{name:'AbortError'});
 const {onUpdate,onRefreshError,cache:cacheMode,...requestOptions}=options;
 const cacheable=(options.method||'GET')==='GET'&&PUBLIC_DATA.test(path);
 const cached=cacheable?await readCopy(path).catch(()=>null):null;
 if(options.signal?.aborted)throw Object.assign(Error('Consulta cancelada'),{name:'AbortError'});
 if(cached&&cacheMode==='archive'&&cached.data.closed&&!cached.data.error)return {...cached.data,fromCache:true,savedAt:cached.savedAt};
 if(cached&&Platform.OS==='web'&&globalThis.navigator?.onLine===false)return {...limitData(path,cached.data),error:true,offline:true,savedAt:cached.savedAt};
 const forceNetwork=['reload','no-store'].includes(cacheMode)||/[?&]refresh=1(?:&|$)/.test(path);
 if(cached&&!forceNetwork){
  const age=Date.now()-Date.parse(cached.savedAt);
  if(!Number.isFinite(age)||age<0||age>=MAX_AGE){
   if(!refreshing.has(path)){
    const job=baseApi(path,{...requestOptions,signal:undefined,cache:'reload',_background:true});
    refreshing.set(path,job);job.finally(()=>{if(refreshing.get(path)===job)refreshing.delete(path)}).catch(()=>{});
   }
   refreshing.get(path).then(data=>{if(!options.signal?.aborted)onUpdate?.(data)}).catch(error=>{
    if(options.signal?.aborted)return;
    if(onRefreshError)onRefreshError(error);
    else onUpdate?.({...limitData(path,cached.data),fromCache:true,error:true,offline:true,savedAt:cached.savedAt});
   }).catch(()=>{});
  }
  return {...limitData(path,cached.data),fromCache:true,savedAt:cached.savedAt};
 }
 if(cached&&forceNetwork)onUpdate?.({...limitData(path,cached.data),fromCache:true,savedAt:cached.savedAt});
 const {_background,...fetchOptions}=requestOptions;
 const version=cacheable?(versions.get(path)||0)+1:0;
 if(cacheable)versions.set(path,version);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),_background?45000:25000);
 const abortFromCaller=()=>controller.abort();
 if(options.signal?.aborted)controller.abort();
 else options.signal?.addEventListener('abort',abortFromCaller,{once:true});
 try{
  const r=await fetch(apiBase+path,{...fetchOptions,...(['reload','no-store'].includes(cacheMode)?{cache:cacheMode}:{}),headers:{...options.headers,'X-App-Platform':Platform.OS},signal:controller.signal});
  const d=limitData(path,await r.json());
  if(!r.ok){const e=Error(d.error||'Servicio no disponible');e.status=r.status;throw e}
  if(cacheable&&version!==versions.get(path)){
   const latest=await readCopy(path).catch(()=>null);
   return latest?{...limitData(path,latest.data),fromCache:true,savedAt:latest.savedAt}:d;
  }
  if(cacheable&&!d.error){await saveCopy(path,d).catch(()=>{});if(path.startsWith('/api/match?')&&path.includes('&refresh=1'))await saveCopy(path.replace('&refresh=1',''),d).catch(()=>{})}
  return d;
 }catch(error){
  if(cacheable&&version!==versions.get(path)&&!options.signal?.aborted){
   const latest=await readCopy(path).catch(()=>null);
   if(latest)return {...limitData(path,latest.data),fromCache:true,savedAt:latest.savedAt};
  }
  if(cacheable&&!_background&&!options.signal?.aborted&&(!error.status||error.status>=500)){
   if(cached)return {...limitData(path,cached.data),error:true,offline:true,savedAt:cached.savedAt};
  }
  if(controller.signal.aborted&&!options.signal?.aborted)throw Error('La consulta tardó demasiado. Comprueba la conexión e inténtalo de nuevo.');
  throw error;
 }finally{
  clearTimeout(timeout);
  options.signal?.removeEventListener('abort',abortFromCaller);
 }
}

const goalkeeperJobs=new Map();
async function enrichKeepers(path,data,options){
 if(!Array.isArray(data?.players)||!/^\/api\/(players|team-ranking)\?/.test(path))return data;
 const teamId=new URL('https://local'+path).searchParams.get('team');if(!teamId)return data;
 const teamKey='goalkeeperTotals.v1.'+teamId,stored=await readCopy(teamKey).catch(()=>null);
 let totals=stored?.data;
 if(!options._keepersLocalOnly&&(!totals||['reload','no-store'].includes(options.cache)||Date.now()-Date.parse(stored.savedAt)>300000)){
  if(!goalkeeperJobs.has(teamId)){const job=(async()=>{const pages=[],seen=new Set();let offset=0,failed=false;do{if(seen.has(offset))throw Error('Paginación de actas incorrecta');seen.add(offset);const page=await baseApi('/api/goalkeepers?team='+encodeURIComponent(teamId)+'&offset='+offset,{cache:options.cache,signal:options.signal});if(page.error){failed=true;break}pages.push(...page.records);offset=page.nextOffset;}while(Number.isSafeInteger(offset)&&offset>0);if(failed)throw Error('Actas pendientes');const result={players:sumGoalkeepers(pages,teamId),checkedAt:new Date().toISOString(),missing:pages.filter(p=>p.error).length};await saveCopy(teamKey,result).catch(()=>{});return result})().finally(()=>goalkeeperJobs.delete(teamId));goalkeeperJobs.set(teamId,job)}
  if(totals&&!['reload','no-store'].includes(options.cache)){goalkeeperJobs.get(teamId).then(()=>enrichKeepers(path,data,{...options,_keepersLocalOnly:true})).catch(()=>enrichKeepers(path,data,{...options,_keepersLocalOnly:true,_keepersStale:true})).then(value=>{if(!options.signal?.aborted)options.onKeeperUpdate?.(value)}).catch(()=>{})}
  else try{totals=await goalkeeperJobs.get(teamId)}catch{if(totals)totals={...totals,stale:true}}
 }
 const players=data.players.map(p=>{const value=totals?.players?.find(v=>v.playerId===String(p.id)),keeper=value||p.isGoalkeeper||/portero|guardameta/i.test(String(p.position));return keeper?{...p,...(value||{goalsConceded:null,cleanSheets:null}),isGoalkeeper:true,goalkeeperPartial:!!(value?.goalkeeperPartial||totals?.missing||totals?.stale||options._keepersStale||!value),goalkeeperUpdatedAt:totals?.checkedAt}:p});
 return {...data,players};
}
export async function api(path,options={}){
 const enriched=/^\/api\/(players|team-ranking)\?/.test(path);if(!enriched)return baseApi(path,options);
 let sequence=0;const enhance=(value,ticket)=>enrichKeepers(path,value,{...options,onKeeperUpdate:data=>{if(ticket===sequence&&!options.signal?.aborted)options.onUpdate?.(data)}});const onUpdate=value=>{const current=++sequence;enhance(value,current).then(data=>{if(current===sequence&&!options.signal?.aborted)options.onUpdate?.(data)}).catch(()=>{})};
 const value=await baseApi(path,{...options,onUpdate});const ticket=++sequence;const result=await enhance(value,ticket);if(options.signal?.aborted)throw Object.assign(Error('Consulta cancelada'),{name:'AbortError'});return result;
}
