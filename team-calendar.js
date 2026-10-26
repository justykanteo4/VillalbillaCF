import {matchWithReport} from './match-report.cjs';
import {api} from './api';
import {readCopy,saveCopy} from './offline';
import {currentRound} from './team-experience.cjs';
const pending=new Map(),writes=new Map(),reports=new Map();
const keyFor=id=>'calendar-archive.v1.'+id;
function serial(id,work){const result=(writes.get(id)||Promise.resolve()).catch(()=>{}).then(work);writes.set(id,result);return result.finally(()=>{if(writes.get(id)===result)writes.delete(id)})}
function withReports(id,fixtures){return fixtures.map(m=>{const report=reports.get(id)?.get(m.id);return report?matchWithReport(m,report):m})}
async function saveMerged(id,incoming){return serial(id,async()=>{const previous=await readCopy(keyFor(id)).catch(()=>null),fixtures=new Map((previous?.data?.fixtures||[]).map(m=>[m.id,m]));incoming.fixtures.forEach(m=>fixtures.set(m.id,m));const merged={...(previous?.data||{}),...incoming,fixtures:withReports(id,[...fixtures.values()])};await saveCopy(keyFor(id),merged);return merged})}
export function loadTeamCalendar(teamId,{onUpdate,force=false}={}){
 if(pending.has(teamId))return pending.get(teamId).then(value=>{onUpdate?.(value);return value});
 const work=(async()=>{
  const cached=await readCopy(keyFor(teamId)).catch(()=>null);if(cached)onUpdate?.(cached.data);
  try{const value=await api('/api/team-calendar?team='+encodeURIComponent(teamId)+(cached?'&current=1':''),{cache:'reload'});if(value.error)throw Error('Calendario no actualizado');const merged=await saveMerged(teamId,value);onUpdate?.(merged);const round=currentRound(merged.fixtures,new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}));void archiveReports(teamId,merged.fixtures,round);return merged}
  catch(error){const latest=await readCopy(keyFor(teamId)).catch(()=>cached);if(latest){const value={...latest.data,error:true};onUpdate?.(value);return value}throw error}
 })().finally(()=>pending.delete(teamId));pending.set(teamId,work);return work;
}
const archiving=new Set();
async function archiveReports(teamId,fixtures,round){if(archiving.has(teamId))return;archiving.add(teamId);try{for(const m of fixtures){if(m.round===round||!Number.isInteger(m.homeScore)||!Number.isInteger(m.awayScore))continue;await api('/api/match?team='+teamId+'&match='+m.id,{cache:'archive'}).catch(()=>{})}}finally{archiving.delete(teamId)}}
export async function applyTeamReport(teamId,report){if(!report?.closed||report.error)return;if(!reports.has(teamId))reports.set(teamId,new Map());reports.get(teamId).set(report.id,report);return serial(teamId,async()=>{const cached=await readCopy(keyFor(teamId)).catch(()=>null);if(cached)await saveCopy(keyFor(teamId),{...cached.data,fixtures:withReports(teamId,cached.data.fixtures)})})}
