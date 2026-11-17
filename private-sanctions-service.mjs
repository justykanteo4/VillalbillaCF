import {decodeJwt} from 'jose';
import verification from './account-verification.cjs';
import {verifyAccessUser} from './access-service.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import teams from './teams.json' with {type:'json'};
import {getOfficialGroup,syncOfficialGroup,groupKey} from './server/official-source.mjs';
import official from './official-sanctions.cjs';
import calendars from './server/news.cjs';
import roster from './players-seed.json' with {type:'json'};
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}}),deny=()=>{throw Object.assign(Error('Acceso reservado a entrenadores del equipo.'),{status:403})};
export async function authorizeSanctions(request,env,team){const uid=await verifyAccessUser(request);if(!verification.verifiedClaims(decodeJwt(request.headers.get('Authorization').slice(7))))deny();try{await verifyAdmin(request,env);return uid}catch(e){if(e.status!==403)throw e}const r=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(15000)});if(!r.ok)deny();const f=(await r.json()).fields,c=f?.claim?.mapValue?.fields,ids=[c?.teamId?.stringValue,...(c?.teamIds?.arrayValue?.values||[]).map(v=>v.stringValue)];if(f?.status?.stringValue!=='approved'||c?.role?.stringValue==='player'||!ids.includes(team.id))deny();return uid}
export async function handlePrivateSanctions(request,env,ctx,{authorize=authorizeSanctions,read=getOfficialGroup,sync=syncOfficialGroup,getFixtures=calendars.groupFixtures}={}){
 const url=new URL(request.url);if(url.pathname!=='/api/private/sanctions')return null;
 try{if(request.method!=='GET')return reply({error:'Método no permitido.'},405);const team=teams.find(t=>t.id===url.searchParams.get('team'));if(!team)return reply({error:'Equipo no encontrado.'},404);await authorize(request,env,team);if(!env.VISITS_DB)return reply({error:'Servicio no disponible.'},503);
  const calendarWork=Promise.resolve().then(()=>getFixtures(team.id)).then(fixtures=>({fixtures}),()=>({error:true}));
  let stored=await read(env,team);if(!stored||url.searchParams.get('refresh')==='1'){await sync(env,team);stored=await read(env,team)}else if(Date.now()-Date.parse(stored.checked_at)>3600000)ctx?.waitUntil?.(sync(env,team));
  if(!stored)return reply({teamId:team.id,pending:[],allSanctions:[],opponentDismissals:[],yellowWarnings:[],error:true,sourceAvailable:false,sourceStatus:env.RFFM_SESSION?'pending':'not-configured',allTeamsDataComplete:false,updatedAt:null});
  let fixtures=[],calendarComplete=true;try{const result=await calendarWork;fixtures=result.fixtures;if(!Array.isArray(fixtures))throw Error();await env.VISITS_DB.prepare('UPDATE official_sanction_groups SET fixtures_json=? WHERE group_key=?').bind(JSON.stringify(fixtures),groupKey(team)).run()}catch{calendarComplete=false;fixtures=JSON.parse(stored.fixtures_json||'[]')}
  const records=JSON.parse(stored.records_json),ordered=fixtures.slice().sort((a,b)=>a.round-b.round),played=m=>Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore),own=ordered.filter(m=>[m.homeId,m.awayId].includes(team.id)),next=own.find(m=>!played(m)),opponentId=next?(next.homeId===team.id?next.awayId:next.homeId):null;
  const visible=fixtures.length?official.currentOfficialSanctions(records,fixtures):records.filter(r=>r.duration&&r.round===Math.max(...records.map(x=>x.round))).map(r=>({...r,duration:r.duration.text,publishedMatches:r.duration.unit==='matches'?r.duration.count:null,pendingMatches:null,reason:r.reason,source:'official'}));
  const all=visible.map(item=>{const player=roster.teams.find(t=>t.id===item.teamId)?.players.find(p=>p.id===item.playerId);return {...item,number:item.role==='staff'?null:player?.number||null}}),selected=url.searchParams.get('scope')==='team'?all.filter(r=>r.teamId===team.id||r.teamId===opponentId):all;
  const pending=selected.filter(r=>r.teamId===team.id);return reply({teamId:team.id,pending,allSanctions:selected,opponentDismissals:selected.filter(r=>r.teamId===opponentId),yellowWarnings:official.officialWarnings(records,team.id,pending),nextMatch:next?{id:next.id,round:next.round,date:next.date,opponentId}:null,sourceAvailable:true,sourceStatus:stored.last_error?'stale':'ready',source:'official',sourceUrl:official.OFFICIAL_URL,calendarComplete,ownActAvailable:true,opponentActAvailable:true,opponentDataComplete:calendarComplete&&!stored.last_error,allTeamsDataComplete:calendarComplete&&!stored.last_error,updatedAt:stored.checked_at,error:!!stored.last_error});
 }catch(e){return reply({error:e.status?e.message:'No se pudieron consultar las sanciones oficiales.'},e.status||503)}
}
