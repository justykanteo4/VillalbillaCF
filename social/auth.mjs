import {createRemoteJWKSet,jwtVerify} from 'jose';
import teams from '../teams.json' with {type:'json'};
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const admins=new Set(['albaresfernandez@gmail.com','appvillalbilla@gmail.com']);
export const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const validTeam=id=>typeof id==='string'&&teams.some(team=>team.id===id);
export function actorFromClaims(claims,profile,dynamicAdmin=false){
 if(!claims.sub||claims.sub.length>128||claims.email_verified!==true)throw fail('Inicia sesión con una cuenta verificada.',403);
 const admin=admins.has(String(claims.email||'').toLowerCase())||dynamicAdmin;
 if(!admin&&(profile?.status!=='approved'||!validTeam(profile.claim?.teamId)))throw fail('Tu acceso al club debe estar aprobado.',403);
 return {uid:claims.sub,name:String(profile?.claim?.name||profile?.name||claims.name||'Miembro del club').slice(0,100),admin,teamId:admin?null:profile.claim.teamId,trainer:admin||!profile.claim.role||profile.claim.role==='trainer',expiresAt:Math.min(Number(claims.exp)*1000,Date.now()+300000)};
}
export async function authenticateSocial(token){
 if(typeof token!=='string'||token.length>12000)throw fail('Inicia sesión para participar.',401);
 let claims;
 try{({payload:claims}=await jwtVerify(token,keys,{issuer:'https://securetoken.google.com/villalbillacf',audience:'villalbillacf',algorithms:['RS256']}))}catch{throw fail('La sesión ha caducado. Vuelve a entrar.',401)}
 if(claims.email_verified!==true)throw fail('Verifica tu cuenta antes de participar.',403);
 const read=async path=>{
  const response=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
  if(response.status===404)return null;
  if(!response.ok)throw fail('No se pudo comprobar tu acceso al club.',503);
  return (await response.json()).fields;
 };
 const fields=await read('trainerProfiles/'+encodeURIComponent(claims.sub));
 const claim=fields?.claim?.mapValue?.fields;
 const profile={status:fields?.status?.stringValue,name:fields?.name?.stringValue,claim:claim?{teamId:claim.teamId?.stringValue,role:claim.role?.stringValue,name:claim.name?.stringValue}:null};
 // Most users need one profile read; dynamic admins are checked only if necessary.
 const dynamicAdmin=!admins.has(String(claims.email||'').toLowerCase())&&claims.email?!!(await read('clubAdmins/'+encodeURIComponent(claims.email.toLowerCase()))):false;
 return actorFromClaims(claims,profile,dynamicAdmin);
}
export function requireTeam(actor,teamId){if(!validTeam(teamId)||(!actor.admin&&actor.teamId!==teamId))throw fail('Este chat es privado para los miembros de ese equipo.',403)}
export function requireModerator(actor,teamId){requireTeam(actor,teamId);if(!actor.trainer)throw fail('Solo el cuerpo técnico puede moderar el chat.',403)}
export function text(value,max=2000){if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw fail('Escribe un texto válido de hasta '+max+' caracteres.');return value.trim()}
export function topicKey(value){
 if(typeof value!=='string')throw fail('Conversación no válida.');
 if(/^news:[A-Za-z0-9_-]{1,100}$/.test(value)||/^forum:[a-f0-9-]{36}$/.test(value))return value;
 const parts=value.split(':');if(parts.length===3&&parts[0]==='match'&&validTeam(parts[1])&&/^\d{1,24}$/.test(parts[2]))return value;
 throw fail('Conversación no válida.');
}
export const idKey=value=>{if(typeof value!=='string'||!(/^[a-f0-9-]{36}$/.test(value)))throw fail('Identificador no válido.');return value};
export const pageCursor=value=>{if(value===null||value===undefined||value==='')return Number.MAX_SAFE_INTEGER;const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw fail('Página no válida.');return n};
