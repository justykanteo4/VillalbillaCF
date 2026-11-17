import {decodeJwt} from 'jose';
import {verifyAccessUser} from './access-service.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import verification from './account-verification.cjs';
import policy from './goalkeeper-adjustments.cjs';
import teams from './teams.json' with {type:'json'};
import seed from './club-goalkeepers-seed.json' with {type:'json'};
const season='2026-27',reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}}),fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function authorizeKeeperAdjustment(request,env,teamId){
 const uid=await verifyAccessUser(request);if(!verification.verifiedClaims(decodeJwt(request.headers.get('Authorization').slice(7))))throw fail('Verifica tu cuenta para editar.',403);
 try{await verifyAdmin(request,env);return uid}catch(e){if(e.status!==403)throw e}
 const response=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(15000)});if(!response.ok)throw fail('No se pudo comprobar tu equipo.',403);
 const f=(await response.json()).fields,c=f?.claim?.mapValue?.fields,profile={status:f?.status?.stringValue,claim:{role:c?.role?.stringValue,teamId:c?.teamId?.stringValue,teamIds:c?.teamIds?.arrayValue?.values?.map(v=>v.stringValue)||[]}};
 if(!policy.permittedTeams(profile).includes(teamId))throw fail('Solo los entrenadores asignados a este equipo pueden modificarlo.',403);return uid;
}
export async function handleKeeperAdjustments(request,env,{authorize=authorizeKeeperAdjustment}={}){
 const url=new URL(request.url);if(url.pathname!=='/api/goalkeeper-adjustments')return null;
 try{const db=env.CHAT_DB;if(!db)throw fail('Servicio no disponible.',503);
 if(!['GET','POST'].includes(request.method))return reply({error:'Método no permitido.'},405);
 if(request.method==='POST'){
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw fail('Origen no permitido.',403);
  const raw=await request.text();if(raw.length>2000)throw fail('Solicitud demasiado grande.',413);let value;try{value=JSON.parse(raw)}catch{throw fail('Datos no válidos.')}
  const {teamId,playerId,change,expectedVersion,baseGoals}=value||{};
  if(!teams.some(t=>t.id===teamId)||!/^\d{1,20}$/.test(playerId||'')||![1,-1].includes(change)||!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!Number.isInteger(baseGoals)||baseGoals<0||baseGoals>10000)throw fail('Datos de portero no válidos.');
  const uid=await authorize(request,env,teamId);
  if(!seed.teams.find(t=>t.id===teamId)?.players.some(p=>String(p.id)===playerId))throw fail('Portero no registrado en este equipo.',404);
  const result=expectedVersion===0?await db.prepare('INSERT OR IGNORE INTO goalkeeper_adjustments(season,team_id,player_id,delta,version,updated_at,updated_by) SELECT ?,?,?,?,1,?,? WHERE ?+?>=0').bind(season,teamId,playerId,change,Date.now(),uid,baseGoals,change).run():await db.prepare('UPDATE goalkeeper_adjustments SET delta=delta+?,version=version+1,updated_at=?,updated_by=? WHERE season=? AND team_id=? AND player_id=? AND version=? AND delta+? BETWEEN -1000 AND 1000 AND ?+delta+?>=0').bind(change,Date.now(),uid,season,teamId,playerId,expectedVersion,change,baseGoals,change).run();
  if(!result.meta?.changes)throw fail('Los datos han cambiado o el total no puede ser negativo. Actualiza y vuelve a intentarlo.',409);
 }
 const rows=await db.prepare('SELECT team_id AS teamId,player_id AS playerId,delta,version,updated_at AS updatedAt FROM goalkeeper_adjustments WHERE season=?').bind(season).all();return reply({season,adjustments:rows.results});
 }catch(e){return reply({error:e.status?e.message:'No se pudo guardar o consultar el ajuste.'},e.status||503)}
}
