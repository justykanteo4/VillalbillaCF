import {preloadTeamMinutes} from './useTeamMinutes';
import {AppState} from 'react-native';
import {api} from './api';
import {readCopy,saveCopy} from './offline';
import {loadTeamCalendar} from './team-calendar';
const queued=new Set();let tail=Promise.resolve();
export function warmTeamCache(teamId){if(!teamId||teamId==='Todos'||queued.has(teamId))return;queued.add(teamId);const job=tail.catch(()=>{}).then(async()=>{const key='offline-team-pack.v1.'+teamId,saved=await readCopy(key).catch(()=>null);if(saved&&Date.now()-Date.parse(saved.savedAt)<6*3600000)return;if(AppState.currentState!=='active')return;let complete=true;for(const resource of ['team-roster','players','team-staff','standings','sanctions','league-scorers']){if(AppState.currentState!=='active')return;try{const value=await api('/api/'+resource+'?team='+encodeURIComponent(teamId)+(resource==='sanctions'?'&scope=team':''));if(value.error)complete=false}catch{complete=false}}if(AppState.currentState!=='active')return;try{await preloadTeamMinutes(teamId)}catch{complete=false}if(AppState.currentState!=='active')return;try{const value=await loadTeamCalendar(teamId);if(value.error)complete=false}catch{complete=false}if(complete)await saveCopy(key,{teamId,complete:true})}).finally(()=>queued.delete(teamId));tail=job;job.catch(()=>{})}
