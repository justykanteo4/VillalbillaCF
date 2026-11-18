const {test}=require('node:test');
const assert=require('node:assert/strict');
const {visibleClubTeamIds,canEditClubTeam}=require('./club-role-policy.cjs');
const teams=['infantil-a','infantil-b','aficionado'];
const trainer={status:'approved',claim:{role:'trainer',teamId:'infantil-b',teamIds:['infantil-b','fake']}};
const editor={status:'approved',claim:{role:'editor',editorPermissions:['results','goals']}};
test('un entrenador solo ve sus equipos asignados y no equipos añadidos fuera del catálogo',()=>{
 assert.deepEqual(visibleClubTeamIds(trainer,teams),['infantil-b']);
 assert.equal(canEditClubTeam(trainer,'infantil-b',{capability:'results'}),true);
 assert.equal(canEditClubTeam(trainer,'infantil-a',{capability:'results'}),false);
 assert.equal(canEditClubTeam(trainer,'infantil-b',{capability:'settings'}),false);
});
test('un editor aprobado ve todos los equipos pero solo dispone de capacidades autorizadas',()=>{
 assert.deepEqual(visibleClubTeamIds(editor,teams),teams);
 assert.equal(canEditClubTeam(editor,'infantil-b',{capability:'goals'}),true);
 assert.equal(canEditClubTeam(editor,'infantil-b',{capability:'mvp'}),false);
 assert.equal(canEditClubTeam(editor,'infantil-b',{capability:'settings'}),false);
});
test('cuentas pendientes, jugadores y perfiles no aprobados carecen de acceso interno',()=>{
 for(const account of [null,{status:'pending',claim:{role:'editor'}},{status:'approved',claim:{role:'player'}},{status:'approved',claim:null}]){
 assert.deepEqual(visibleClubTeamIds(account,teams),[]);
 assert.equal(canEditClubTeam(account,'infantil-b'),false);
 }
});
test('administrador conserva consulta y edición de todos los equipos',()=>{
 const admin={status:'admin'};
 assert.deepEqual(visibleClubTeamIds(admin,teams),teams);
 assert.equal(canEditClubTeam(admin,'infantil-a'),true);
});
