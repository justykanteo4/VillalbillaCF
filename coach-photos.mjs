import bundled from './fantasy-sports.json' with {type:'json'};
import catalog from './fantasy-players.json' with {type:'json'};
import {normalize} from './team-experience.cjs';
import {verifyAccessUser} from './access-service.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import {readFirestoreAccount} from './club-result-authorization.mjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const reply=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export function coachIdentity(c){const ids=[...new Set(catalog.teams.flatMap(t=>t.players).filter(p=>normalize(p.name)===normalize(c.name)).map(p=>String(p.id)))];return {...c,playerId:c.playerId|| (ids.length===1?ids[0]:null),ambiguous:ids.length>1&&!c.playerId}}
export async function coachPhotoDirectory(db){let rows=[];try{rows=(await db.prepare('SELECT coach_id,photo_data,approved FROM fantasy_coach_photos').all()).results}catch(e){if(!/no such table/i.test(String(e.message)))throw e}return bundled.coaches.map(coachIdentity).map(c=>{const row=rows.find(r=>r.coach_id===c.id);return {id:c.id,name:c.name,teamId:c.teamId,teamIds:c.teamIds,playerId:c.playerId,ambiguous:c.ambiguous,photo:c.playerId?null:(row?.approved?row.photo_data:c.photo||null)}})}
export async function handleCoachPhotos(request,env){
 const url=new URL(request.url),admin=url.pathname==='/api/fantasy/admin/coach-photos',self=url.pathname==='/api/coach-photo/self';if(!admin&&!self)return null;
 try{if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
 const uid=admin?await verifyAdmin(request,env):await verifyAccessUser(request),db=env.CHAT_DB;if(!db)throw fail('Servicio no disponible.',503);
 let own=null;
 if(self){const response=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(10000)});if(!response.ok)throw fail('No se pudo verificar tu ficha.',403);const profile=readFirestoreAccount(await response.json(),uid),claim=profile?.claim;if(!['pending','approved'].includes(profile?.status)||claim?.role!=='trainer'||claim.isPlayer||claim.playerTeams?.length)return reply({eligible:false});const matches=bundled.coaches.map(coachIdentity).filter(c=>normalize(c.name)===normalize(claim.name)&&c.teamIds.some(t=>(claim.teamIds||[claim.teamId]).includes(t)));if(matches.length!==1||matches[0].playerId||matches[0].ambiguous)return reply({eligible:false});own={...matches[0],status:profile.status}}
 const directory=await coachPhotoDirectory(db);
 if(request.method==='GET'){if(admin){const pending=(await db.prepare('SELECT coach_id,photo_data FROM fantasy_coach_photos WHERE approved=0').all()).results;return reply({coaches:directory.map(c=>({...c,pendingPhoto:!c.playerId?pending.find(p=>p.coach_id===c.id)?.photo_data||null:null}))})}const c=directory.find(c=>c.id===own.id),row=await db.prepare('SELECT photo_data,actor_uid FROM fantasy_coach_photos WHERE coach_id=?').bind(own.id).first();return reply({eligible:true,hasPhoto:!!c.photo||!!row,photo:c.photo||(row?.actor_uid===uid?row.photo_data:null)})}
 const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw fail('Origen no permitido.',403);
 const raw=await request.text();if(raw.length>70000)throw fail('Foto demasiado grande.',413);let v;try{v=JSON.parse(raw)}catch{throw fail('Datos no válidos.')}
 const c=directory.find(c=>c.id===(admin?v.coachId:own.id));if(!c||c.playerId||c.ambiguous)throw fail('Este entrenador utiliza la ficha de jugador o requiere revisión.',409);
 if(v.photo===null&&admin){await db.prepare('DELETE FROM fantasy_coach_photos WHERE coach_id=?').bind(c.id).run();return reply({saved:true})}
 if(v.consent!==true||typeof v.photo!=='string'||v.photo.length>65000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(v.photo))throw fail('Confirma el uso de la fotografía en Fantasy y selecciona una imagen válida.');
 if(self){const existing=await db.prepare('SELECT 1 FROM fantasy_coach_photos WHERE coach_id=?').bind(c.id).first();if(c.photo||existing)throw fail('Ya existe una fotografía. Contacta con el administrador.',409)}
 const statement=admin?'INSERT INTO fantasy_coach_photos VALUES(?,?,?,?,1) ON CONFLICT(coach_id) DO UPDATE SET photo_data=excluded.photo_data,updated_at=excluded.updated_at,actor_uid=excluded.actor_uid,approved=1':'INSERT OR IGNORE INTO fantasy_coach_photos VALUES(?,?,?,?,?)';
 const q=db.prepare(statement),result=await (admin?q.bind(c.id,v.photo,Date.now(),uid):q.bind(c.id,v.photo,Date.now(),uid,own.status==='approved'?1:0)).run();if(!result.meta?.changes)throw fail('La fotografía ya existe.',409);return reply({saved:true,pending:!admin&&own.status!=='approved'});
 }catch(e){return reply({error:e.status?e.message:'No se pudo gestionar la fotografía.'},e.status||503)}
}
