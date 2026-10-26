import {api} from './api';
import {readCopy,saveCopy} from './offline';
import {currentRound} from './team-experience.cjs';
const pending=new Map();
export function loadTeamCalendar(teamId,{onUpdate,force=false}={}){
 if(pending.has(teamId))return pending.get(teamId).then(value=>{onUpdate?.(value);return value});
 const work=(async()=>{
  const key='calendar-archive.v1.'+teamId,cached=await readCopy(key).catch(()=>null);
  if(cached)onUpdate?.(cached.data);
  try{
   const value=await api('/api/team-calendar?team='+encodeURIComponent(teamId)+(cached?'&current=1':''),{cache:'reload'});
   if(value.error)throw Error('Calendario no actualizado');
   const fixtures=new Map((cached?.data?.fixtures||[]).map(m=>[m.id,m]));
   (value.fixtures||[]).forEach(m=>fixtures.set(m.id,m));
   const merged={...(cached?.data||{}),...value,fixtures:[...fixtures.values()]};
   await saveCopy(key,merged);onUpdate?.(merged);
   // Archive reports sequentially in the background, without holding up the screen.
   const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}),round=currentRound(merged.fixtures,today);
   void archiveReports(teamId,merged.fixtures,round);
   return merged;
  }catch(error){if(cached){const value={...cached.data,error:true};onUpdate?.(value);return value}throw error}
 })().finally(()=>pending.delete(teamId));pending.set(teamId,work);return work;
}
const archiving=new Set();
async function archiveReports(teamId,fixtures,round){
 if(archiving.has(teamId))return;archiving.add(teamId);
 try{for(const m of fixtures){if(m.round===round||!Number.isInteger(m.homeScore)||!Number.isInteger(m.awayScore))continue;await api('/api/match?team='+teamId+'&match='+m.id,{cache:'archive'}).catch(()=>{})}}finally{archiving.delete(teamId)}
}
