import catalog from '../teams.json' with {type:'json'};
import source from '../official-sanctions.cjs';
const {OFFICIAL_URL,parseOfficialSanctions}=source;
export const sourceGroups=[...new Map(catalog.map(t=>[t.competition+':'+t.group,t])).values()];
export const groupKey=team=>team.competition+':'+team.group;
export const queryUrl=team=>OFFICIAL_URL+'?'+new URLSearchParams({cod_primaria:'1000191',buscar:'1',Sch_Cod_Temporada:'22',Sch_Tipo_Juego:team.gameType,Sch_Competicion:team.competition,Sch_Grupo:team.group});
export function decodePage(bytes,contentType=''){try{return new TextDecoder(/utf-8/i.test(contentType)?'utf-8':'windows-1252').decode(bytes)}catch{return Array.from(new Uint8Array(bytes),c=>String.fromCharCode(c)).join('')}}
const errorCode=e=>['OFFICIAL_AUTH','OFFICIAL_CONTEXT','OFFICIAL_FORMAT','OFFICIAL_NOT_CONFIGURED'].includes(e.message)?e.message:'OFFICIAL_NETWORK';
export async function readOfficialGroup(env,team,{fetcher=fetch}={}){
 if(!env.RFFM_SESSION)throw Error('OFFICIAL_NOT_CONFIGURED');const checkedAt=new Date().toISOString();
 const response=await fetcher(queryUrl(team),{headers:{Cookie:env.RFFM_SESSION,'User-Agent':'Mozilla/5.0'},redirect:'manual',signal:AbortSignal.timeout(20000)});
 if([401,403].includes(response.status))throw Error('OFFICIAL_AUTH');
 if(response.status>=300&&response.status<400)throw Error('OFFICIAL_AUTH');if(!response.ok)throw Error('OFFICIAL_NETWORK');
 const html=decodePage(await response.arrayBuffer(),response.headers.get('Content-Type'));const result=parseOfficialSanctions(html,team),clubIds=new Set(catalog.filter(t=>t.competition===team.competition&&t.group===team.group).map(t=>t.id));return {...result,records:result.records.filter(r=>r.duration||clubIds.has(r.teamId)),checkedAt};
}
export async function getOfficialGroup(env,team){return env.VISITS_DB.prepare('SELECT * FROM official_sanction_groups WHERE group_key=?').bind(groupKey(team)).first()}
const flights=new Map();
export async function syncOfficialGroup(env,team,options={}){
 const key=groupKey(team);if(flights.has(key))return flights.get(key);const started=Date.now();
 const work=(async()=>{try{const value=await readOfficialGroup(env,team,options);await env.VISITS_DB.prepare('INSERT INTO official_sanction_groups(group_key,competition,group_id,records_json,checked_at,attempted_at,last_error) VALUES(?,?,?,?,?,?,NULL) ON CONFLICT(group_key) DO UPDATE SET records_json=excluded.records_json,checked_at=excluded.checked_at,attempted_at=excluded.attempted_at,last_error=NULL WHERE excluded.attempted_at>=official_sanction_groups.attempted_at').bind(key,team.competition,team.group,JSON.stringify(value.records),value.checkedAt,started).run();await env.VISITS_DB.prepare('UPDATE official_sanctions_sync SET blocked_until=0,last_touch=? WHERE id=1').bind(Date.now()).run();return {ok:true}}
 catch(e){const code=errorCode(e);await env.VISITS_DB.prepare('UPDATE official_sanction_groups SET last_error=?,attempted_at=? WHERE group_key=? AND attempted_at<=?').bind(code,started,key,started).run();if(code==='OFFICIAL_AUTH'){await env.VISITS_DB.prepare("UPDATE official_sanction_groups SET last_error='OFFICIAL_AUTH' WHERE attempted_at<=?").bind(started).run();await env.VISITS_DB.prepare('UPDATE official_sanctions_sync SET blocked_until=? WHERE id=1').bind(Date.now()+1800000).run()}return {ok:false,error:code}}})().finally(()=>flights.delete(key));flights.set(key,work);return work;
}
export async function scheduledOfficialSanctions(env,{fetcher=fetch,now=Date.now()}={}){
 const db=env.VISITS_DB;if(!db||!env.RFFM_SESSION)return;
 let state;try{state=await db.prepare('SELECT * FROM official_sanctions_sync WHERE id=1').first()}catch{return}if(!state)return;
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.RFFM_SESSION))),x=>x.toString(16).padStart(2,'0')).join('');
 const sessionChanged=state.fingerprint!==fingerprint;
 if(sessionChanged){await db.prepare('UPDATE official_sanctions_sync SET fingerprint=?,blocked_until=0 WHERE id=1').bind(fingerprint).run();state.blocked_until=0}
 if(state.blocked_until>now)return;const lease=now+30000,claim=await db.prepare('UPDATE official_sanctions_sync SET lease_until=? WHERE id=1 AND lease_until<?').bind(lease,now).run();if(!claim.meta?.changes)return;
 try{const result=await db.prepare('SELECT group_key,checked_at,attempted_at FROM official_sanction_groups').all(),rows=new Map(result.results.map(r=>[r.group_key,r]));
  const day=new Date(new Date(now).toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'})+'T12:00:00Z').getUTCDay(),age=([4,5].includes(day)?1:6)*3600000;
  const due=sourceGroups.filter(t=>sessionChanged&&t.id===sourceGroups[0].id||!rows.has(groupKey(t))||now-Date.parse(rows.get(groupKey(t)).checked_at)>=age).sort((a,b)=>(rows.get(groupKey(a))?.attempted_at||0)-(rows.get(groupKey(b))?.attempted_at||0));
  if(due.length)await syncOfficialGroup(env,due[0],{fetcher});
  else if(now-state.last_touch>=600000){const response=await fetcher(OFFICIAL_URL+'?cod_primaria=1000191',{headers:{Cookie:env.RFFM_SESSION,'User-Agent':'Mozilla/5.0'},redirect:'manual',signal:AbortSignal.timeout(15000)}),page=response.ok?decodePage(await response.arrayBuffer(),response.headers.get('Content-Type')):'';if([301,302,303,307,308,401,403].includes(response.status)||/name=["']NLogin["']/i.test(page)){await db.prepare("UPDATE official_sanction_groups SET last_error='OFFICIAL_AUTH'").run();await db.prepare('UPDATE official_sanctions_sync SET blocked_until=? WHERE id=1').bind(now+1800000).run()}else if(response.ok&&/name=["']BuscaNFG_SAN["']/i.test(page)){await db.prepare('UPDATE official_sanctions_sync SET last_touch=? WHERE id=1').bind(now).run()}}
 }finally{await db.prepare('UPDATE official_sanctions_sync SET lease_until=0 WHERE id=1 AND lease_until=?').bind(lease).run()}
}
