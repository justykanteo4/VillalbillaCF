import {gameMinutes} from './game-minutes.cjs';
import {policyAge,mergeNews,mergeRecords,monday,reportSignature,changedReportIds,calendarSignature,selectCurrent} from './offline-policy.cjs';
import {noteSportsRevision,withSportsStats} from './sports-revision';
import {recordDiagnostic} from './diagnostics';
import {readCopy,saveCopy} from './offline';
import {sumGoalkeepers} from './goalkeeper-stats.cjs';
import {Platform,AppState} from 'react-native';
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
 if(cached&&cacheMode==='archive'&&cached.data.closed&&!cached.data.error&&(cached.data.schemaVersion===undefined||cached.data.schemaVersion>=5))return {...cached.data,fromCache:true,savedAt:cached.savedAt};
 if(cached&&Platform.OS==='web'&&globalThis.navigator?.onLine===false)return {...limitData(path,cached.data),error:true,offline:true,savedAt:cached.savedAt};
 const teamIdForCache=new URL(path,'https://local').searchParams.get('team');
 const prepared=cacheable&&cached?(await readCopy(teamIdForCache?'offline-team-pack.v2.'+teamIdForCache:'offline-library.v2').catch(()=>null))?.data?.prepared:false;
 const revision=prepared?(await readCopy(teamIdForCache?'sports-revision.v1.'+teamIdForCache:'sports-club-revision.v1').catch(()=>null))?.data:null;
 const maxAge=prepared?policyAge(path,cached,prepared,revision):MAX_AGE;
 const forceNetwork=['reload','no-store'].includes(cacheMode)||/[?&]refresh=1(?:&|$)/.test(path);
 if(cached&&!forceNetwork){
  const age=Date.now()-Date.parse(cached.savedAt);
  if(!Number.isFinite(age)||age<0||age>=maxAge){
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
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),/^\/api\/(goalkeepers|team-minutes)\?/.test(path)||_background?45000:25000);
 const abortFromCaller=()=>controller.abort();
 if(options.signal?.aborted)controller.abort();
 else options.signal?.addEventListener('abort',abortFromCaller,{once:true});
 try{
  const fetchOptionsWithSignal={...fetchOptions,...(['reload','no-store'].includes(cacheMode)?{cache:cacheMode}:{}),headers:{...options.headers,'X-App-Platform':Platform.OS},signal:controller.signal};
  const deltaNews=path==='/api/news'&&cached&&cached.data.teams?.some(t=>t.fixtures?.length)&&(!forceNetwork||_background),requestPath=deltaNews?path+'?current=1':path;
  let r;try{r=await fetch(apiBase+requestPath,fetchOptionsWithSignal)}catch(error){if(!cacheable||controller.signal.aborted||error.name!=='TypeError')throw error;r=await fetch(apiBase+requestPath,fetchOptionsWithSignal)}
  let payload;try{payload=await r.json()}catch{throw Object.assign(Error('El servidor no ha enviado datos válidos. Vuelve a actualizar.'),{diagnosticCode:'FORMAT'})}
  const d=limitData(path,deltaNews?mergeNews(cached.data,payload):payload);
  if(r.ok&&d.error)recordDiagnostic({category:/match|goalkeepers|team-minutes|report-membership/.test(path)?'actas':'conexion',code:'SOURCE',resource:path,status:r.status});
  if(!r.ok){const e=Error(d.error||'Servicio no disponible');e.status=r.status;throw e}
  if(cacheable&&version!==versions.get(path)){
   const latest=await readCopy(path).catch(()=>null);
   return latest?{...limitData(path,latest.data),fromCache:true,savedAt:latest.savedAt}:d;
  }
  if(cacheable&&!d.error){await saveCopy(path,d).catch(()=>{});if(path.startsWith('/api/match?')&&path.includes('&refresh=1'))await saveCopy(path.replace('&refresh=1',''),d).catch(()=>{})}
  if(cacheable&&!d.error&&path.startsWith('/api/match?')&&(d.closed||d.published)&&teamIdForCache){await noteSportsRevision(teamIdForCache,d.id,reportSignature(d)).catch(()=>{});await applyLocalReport(teamIdForCache,d).catch(()=>{});}
  if(cacheable&&!d.error&&path.split('?')[0]==='/api/news')await Promise.all((d.teams||[]).filter(t=>!t.error).map(t=>noteSportsRevision(t.id,'calendar',calendarSignature(t.fixtures)).catch(()=>{})));
  if(cacheable&&!d.error&&path.split('?')[0]==='/api/news')queueCurrentReports(d.teams||[]);
  return d;
 }catch(error){
  if(!options.signal?.aborted)recordDiagnostic({category:/match|goalkeepers|team-minutes|report-membership/.test(path)?'actas':'conexion',code:controller.signal.aborted?'TIMEOUT':error.diagnosticCode|| (error.status?'HTTP':'NETWORK'),resource:path,status:error.status});
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
 let totals=stored?.data;const pack=(await readCopy('offline-team-pack.v2.'+teamId).catch(()=>null))?.data,revision=(await readCopy('sports-revision.v1.'+teamId).catch(()=>null))?.data;const currentStored=stored&&pack?.prepared&&Array.isArray(totals?.records)&&Date.parse(stored.savedAt)>=(revision?.changedAt||0)&&monday(stored.savedAt)===monday(Date.now())&&(!totals.missing||Date.now()-Date.parse(stored.savedAt)<300000);
 if(!options._keepersLocalOnly&&(!totals||['reload','no-store'].includes(options.cache)||!currentStored&&(pack?.prepared||Date.now()-Date.parse(stored.savedAt)>300000))){
  if(!goalkeeperJobs.has(teamId)){const job=(async()=>{const delta=Array.isArray(totals?.records),pages=[],seen=new Set(),pending=delta?[...new Set([...changedReportIds(revision,stored.savedAt),...totals.records.filter(r=>r.error||r.stale).map(r=>r.id)])].slice(0,20).join(','):'';let offset=0,failed=false;do{if(seen.has(offset))throw Error('Paginación de actas incorrecta');seen.add(offset);const page=await baseApi('/api/goalkeepers?team='+encodeURIComponent(teamId)+(delta?'&current=1&generation='+encodeURIComponent(revision?.changedAt||monday(Date.now()))+(pending?'&pending='+pending:''):'')+'&offset='+offset,{cache:'reload',signal:options.signal});if(page.error){failed=true;break}pages.push(...page.records);offset=page.nextOffset;}while(Number.isSafeInteger(offset)&&offset>0);if(failed)throw Error('Actas pendientes');return withSportsStats(teamId,async()=>{const latest=delta?(await readCopy(teamKey).catch(()=>null))?.data?.records:null;const records=mergeRecords(delta?latest||totals.records:[],pages);const result={records,players:sumGoalkeepers(records,teamId),checkedAt:new Date().toISOString(),missing:records.filter(p=>p.error||p.stale).length};await saveCopy(teamKey,result).catch(()=>{});return result})})().finally(()=>goalkeeperJobs.delete(teamId));goalkeeperJobs.set(teamId,job)}
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

export async function preloadGoalkeeperCache(teamId){const key='goalkeeperTotals.v1.'+teamId;if(goalkeeperJobs.has(teamId))await goalkeeperJobs.get(teamId);let stored=await readCopy(key).catch(()=>null);if(!Array.isArray(stored?.data?.records)){await enrichKeepers('/api/players?team='+teamId,{players:[]},{cache:'reload'});stored=await readCopy(key).catch(()=>null)}if(!Array.isArray(stored?.data?.records))throw Error('Actas de porteros pendientes');return stored.data}

function applyLocalReport(teamId,report){return withSportsStats(teamId,async()=>{if(!report.closed)return;const calendar=(await readCopy('calendar-archive.v1.'+teamId).catch(()=>null))?.data,fixture=calendar?.fixtures?.find(m=>m.id===report.id),row={id:report.id,date:fixture?.date,updatedAt:report.updatedAt};const keeperKey='goalkeeperTotals.v1.'+teamId,keepers=(await readCopy(keeperKey).catch(()=>null))?.data;if(Array.isArray(keepers?.records)){const incoming={...row,keepers:report.keeperStats,error:!Array.isArray(report.keeperStats)||!report.keeperStats.some(p=>p.teamId===teamId)},records=mergeRecords(keepers.records,[incoming]);await saveCopy(keeperKey,{...keepers,records,players:sumGoalkeepers(records,teamId),missing:records.filter(r=>r.error||r.stale).length,checkedAt:new Date().toISOString()})}const minuteKey='team-minute-totals.v1.'+teamId,minutes=(await readCopy(minuteKey).catch(()=>null))?.data;if(Array.isArray(minutes?.records)&&Number.isFinite(minutes.duration)){let incoming;try{incoming={...row,minutes:gameMinutes(report.minutesSource,teamId,minutes.duration)}}catch{incoming={...row,error:true}}await saveCopy(minuteKey,{...minutes,records:mergeRecords(minutes.records,[incoming]),updatedAt:new Date().toISOString()})}})}
let reportTail=Promise.resolve();const currentReports=new Set();
function queueCurrentReports(teams){for(const team of teams){if(team.error)continue;for(const fixture of selectCurrent(team.fixtures||[],new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}))){if(!Number.isInteger(fixture.homeScore)||!Number.isInteger(fixture.awayScore))continue;const key=team.id+':'+fixture.id;if(currentReports.has(key))continue;currentReports.add(key);const path='/api/match?team='+team.id+'&match='+fixture.id;reportTail=reportTail.catch(()=>{}).then(async()=>{if(AppState.currentState&&AppState.currentState!=='active')return;const old=(await readCopy(path).catch(()=>null))?.data;if(old?.closed&&old.schemaVersion>=5&&Number(old.homeScore)===fixture.homeScore&&Number(old.awayScore)===fixture.awayScore)return;await baseApi(path+'&refresh=1',{cache:'no-store'})}).catch(()=>{}).finally(()=>currentReports.delete(key))}}}
