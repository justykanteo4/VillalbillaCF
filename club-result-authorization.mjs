import {decodeJwt} from 'jose';
import {verifyAdmin} from './free-notifications.mjs';
import {verifyAccessUser} from './access-service.mjs';
import policy from './club-role-policy.cjs';

// Read the current approved role directly from Firestore. Never trust a role,
// team ID or display name supplied in the edit body or saved on the device.
const denied=(message='No tienes permiso para modificar ese equipo.',status=403)=>Object.assign(Error(message),{status});
function firestoreValue(value){
 if(!value||typeof value!=='object')return null;
 if('stringValue'in value)return value.stringValue;
 if('booleanValue'in value)return value.booleanValue;
 if('integerValue'in value)return Number(value.integerValue);
 if('arrayValue'in value)return (value.arrayValue.values||[]).map(firestoreValue);
 if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,v])=>[key,firestoreValue(v)]));
 return null;
}
export function readFirestoreAccount(doc,uid){
 const fields=doc?.fields;
 if(!fields)return null;
 const values=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,firestoreValue(value)]));
 return {id:uid,status:values.status,claim:values.claim||null,name:values.name||'',email:values.email||''};
}
export async function authorizeClubResultEditor(request,env,teamId,{admin=verifyAdmin,user=verifyAccessUser,loadProfile,capability='results'}={}){
 if(!['results','goals','assists','cards','mvp','calendar','news'].includes(capability))throw denied('Permiso deportivo desconocido.');
 if(!teamId)throw denied();
 // Administrators retain their current verified access, including dynamically
 // assigned club admins. A failed admin check is never proof of editor status.
 try{
  const uid=await admin(request,env);
  const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  const claims=token?decodeJwt(token):{};
  return {uid,role:'admin',name:String(claims.name||claims.email||uid),email:String(claims.email||'')};
 }catch(error){if(error.status!==403)throw error}
 const uid=await user(request);
 const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw denied('Inicia sesión.',401);
 const profile=loadProfile?await loadProfile(uid):await (async()=>{
  const response=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{
   headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw denied('No se han podido comprobar tus permisos.',response.status===404||response.status===403?403:503);
  return readFirestoreAccount(await response.json(),uid);
 })();
 if(!profile||!policy.canEditClubTeam(profile,teamId,{capability}))throw denied();
 return {uid,role:profile.claim.role,name:String(profile.claim.name||profile.name||uid),email:String(profile.email||'')};
}
