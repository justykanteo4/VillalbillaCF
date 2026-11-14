import {preferredStartupTeams,backgroundTurn} from './startup-work';
import {prioritizeTeams} from './startup-performance.cjs';
import {cacheImage} from './CachedImage';
import teams from './teams.json';
import {readCopy,saveCopy} from './offline';
import {warmTeamCache} from './warm-team-cache';
import {api} from './api';
import {AppState} from 'react-native';
let running=null,status={running:false,completed:0,total:teams.length,prepared:false},listeners=new Set();
const update=value=>{status={...status,...value};listeners.forEach(fn=>fn(status))};
export const getOfflineProgress=()=>status;
export const watchOfflineProgress=fn=>{listeners.add(fn);fn(status);return()=>listeners.delete(fn)};
export async function readOfflineProgress(){let completed=0;for(let i=0;i<teams.length;i+=4)completed+=(await Promise.all(teams.slice(i,i+4).map(t=>readCopy('offline-team-pack.v2.'+t.id).catch(()=>null)))).filter(row=>row?.data?.prepared).length;update({completed,prepared:!!(await readCopy('offline-library.v2').catch(()=>null))?.data?.prepared});return status}
export function prepareOfflineLibrary(){if(running)return running;running=(async()=>{await readOfflineProgress();update({running:true});let complete=true;const pending=teams.slice();while(pending.length){if(!await backgroundTurn({delay:1200}))return;const t=prioritizeTeams(pending,preferredStartupTeams())[0];pending.splice(pending.findIndex(p=>p.id===t.id),1);if(AppState.currentState&&AppState.currentState!=='active')return;if(!await warmTeamCache(t.id,{initialOnly:true,priority:false}))complete=false;await readOfflineProgress()}for(const path of ['/api/news','/api/scorers','/api/instagram','/api/notifications']){if(AppState.currentState&&AppState.currentState!=='active')return;try{const value=await api(path);if(value.error||value.teams?.some(t=>t.error))complete=false;if(path==='/api/instagram')for(const post of (value.posts||[]).slice(0,8)){if(post.images?.[0])await cacheImage(post.images[0]).catch(()=>{complete=false})}}catch{complete=false}}if(complete){await saveCopy('offline-library.v2',{prepared:true,preparedAt:new Date().toISOString()});update({prepared:true})}})().finally(()=>{running=null;update({running:false})});running.catch(()=>{});return running}
