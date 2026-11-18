import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorizeClubResultEditor,readFirestoreAccount} from './club-result-authorization.mjs';

const rejectAdmin=async()=>{throw Object.assign(Error('No es administrador'),{status:403})};
const user=async()=> 'coach-1';
function headers(){return new Request('https://club.test/api/admin/result-edits',{headers:{Authorization:'Bearer test-token'}})}
const account=(role,teamIds,extra={})=>({id:'coach-1',status:'approved',email:'coach@club.test',name:'Nombre cuenta',claim:{role,name:'Entrenador Real',teamIds,teamId:teamIds[0],...extra}});

test('Firestore convierte tipos y utiliza campos del servidor en lugar de datos enviados por el cliente',()=>{
 const doc={fields:{status:{stringValue:'approved'},name:{stringValue:'Nombre'},claim:{mapValue:{fields:{role:{stringValue:'editor'},teamIds:{arrayValue:{values:[{stringValue:'680163'}]}},editorPermissions:{arrayValue:{values:[{stringValue:'results'}]}}}}}}};
 const found=readFirestoreAccount(doc,'uid-1');
 assert.deepEqual(found.claim,{role:'editor',teamIds:['680163'],editorPermissions:['results']});
 assert.equal(found.status,'approved');
});
test('entrenador aprobado solo edita resultados de sus equipos',async()=>{
 const deps={admin:rejectAdmin,user,loadProfile:async()=>account('trainer',['680163'])};
 const actor=await authorizeClubResultEditor(headers(),{},'680163',deps);
 assert.equal(actor.uid,'coach-1');assert.equal(actor.name,'Entrenador Real');
 await assert.rejects(authorizeClubResultEditor(headers(),{},'otros',deps),e=>e.status===403);
});
test('editor necesita permiso explícito, no puede administrar sin él',async()=>{
 const deps={admin:rejectAdmin,user,loadProfile:async()=>account('editor',[],{editorPermissions:['results']})};
 assert.equal((await authorizeClubResultEditor(headers(),{},'680163',deps)).role,'editor');
 await assert.rejects(authorizeClubResultEditor(headers(),{},'680163',{...deps,loadProfile:async()=>account('editor',[],{editorPermissions:['news']})}),e=>e.status===403);
});
test('usuario pendiente o jugador no puede editar y un fallo de consulta bloquea el acceso',async()=>{
 for(const profile of [{...account('trainer',['680163']),status:'pending'},account('player',['680163'])]){
  await assert.rejects(authorizeClubResultEditor(headers(),{},'680163',{admin:rejectAdmin,user,loadProfile:async()=>profile}),e=>e.status===403);
 }
 await assert.rejects(authorizeClubResultEditor(headers(),{},'680163',{admin:rejectAdmin,user,loadProfile:async()=>{throw Object.assign(Error('Sin acceso Firestore'),{status:503})}}),e=>e.status===503);
});

test('permisos deportivos por capacidad: editor solo puede modificar lo autorizado',async()=>{
 const deps={admin:rejectAdmin,user,loadProfile:async()=>account('editor',[],{editorPermissions:['goals','mvp']})};
 for(const capability of ['goals','mvp'])assert.equal((await authorizeClubResultEditor(headers(),{},'680163',{...deps,capability})).role,'editor');
 for(const capability of ['results','assists','cards','calendar','news'])await assert.rejects(
  authorizeClubResultEditor(headers(),{},'680163',{...deps,capability}),e=>e.status===403);
});
test('entrenador: sus equipos, goles, asistencias, tarjetas y MVP; nunca noticias ni calendario',async()=>{
 const deps={admin:rejectAdmin,user,loadProfile:async()=>account('trainer',['680163'])};
 for(const capability of ['results','goals','assists','cards','mvp']){
  assert.equal((await authorizeClubResultEditor(headers(),{},'680163',{...deps,capability})).role,'trainer');
  await assert.rejects(authorizeClubResultEditor(headers(),{},'999',{...deps,capability}),e=>e.status===403);
 }
 for(const capability of ['calendar','news','unknown'])await assert.rejects(
  authorizeClubResultEditor(headers(),{},'680163',{...deps,capability}),e=>e.status===403);
});
