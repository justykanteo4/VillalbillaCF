const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {resumeArea,startupArea}=require('./startup-route.cjs');
const {choiceFor,KEY,choices}=require('./startup-screen-preference.cjs');
const coach={id:'c',status:'approved',claim:{role:'trainer'}},player={id:'p',status:'approved',claim:{role:'player'}},admin={id:'a',status:'admin'};
test('Pantalla de inicio: respeta preferencias públicas y permite volver al último lugar',()=>{
 assert.equal(resumeArea(coach,'trainer',{area:'Calendario',uid:'c'},'Noticias'),'Noticias');
 assert.equal(resumeArea(coach,'trainer',{area:'Calendario',uid:'c'},'last'),'Calendario');
 assert.equal(resumeArea(coach,'trainer',null,'Resultados'),'Resultados');
 assert.equal(choiceFor('bogus'),'last');
 assert.equal(choiceFor('VillalbillaFantasy'),'VillalbillaFantasy');
 assert.equal(new Set(choices.map(c=>c.id)).size,choices.length);
});
test('Pantalla de inicio: restringe zonas privadas, Fantasy y perfiles de jugador',()=>{
 assert.equal(resumeArea(null,'fan',null,'privado'),startupArea(null,'fan'));
 assert.equal(resumeArea(player,'player',null,'privado'),startupArea(player,'player'));
 assert.equal(resumeArea(coach,'trainer',null,'jugador'),startupArea(coach,'trainer'));
 assert.equal(resumeArea(coach,'trainer',null,'privado'),'privado');
 assert.equal(resumeArea(player,'player',null,'jugador'),'jugador');
 assert.equal(resumeArea(admin,'trainer',null,'VillalbillaFantasy'),'VillalbillaFantasy');
 assert.equal(resumeArea(null,'fan',null,'VillalbillaFantasy'),'Usuario');
});
test('Preferencia personal conectada a la aplicación y al menú',()=>{
 const settings=fs.readFileSync('SettingsHub.js','utf8');
 const app=fs.readFileSync('Club.js','utf8');
 const view=fs.readFileSync('StartupScreenPreference.js','utf8');
 assert.match(settings,/StartupScreenPreference account=\{account\}/);
 assert.match(view,/AsyncStorage\.setItem\(startup\.KEY,id\)/);
 assert.match(app,/startupPreference\.current=startupScreen\.choiceFor\(preferred\)/);
 assert.match(app,/resumeArea\(account,entryRole,lastScreen\.current,startupPreference\.current\)/);
 assert.equal(KEY,'villalbilla.startup-screen.v1');
});
