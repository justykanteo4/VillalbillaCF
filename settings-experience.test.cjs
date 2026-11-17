const {test}=require('node:test'),assert=require('node:assert/strict');
const {nextRoundFixtures}=require('./result-fixtures.cjs');
const {staffDirectory,sumStandings,playerResults}=require('./directory-stats.cjs');
test('resultados: únicamente próxima jornada pendiente, excluye resultados antiguos y próximas jornadas posteriores',()=>{
 const fixtures=[{id:'played',round:1,date:'2026-10-25',homeScore:1,awayScore:1},{id:'past',round:2,date:'2026-10-20',homeScore:null,awayScore:null},{id:'next',round:3,date:'2026-11-01',homeScore:null,awayScore:null},{id:'future',round:4,date:'2026-11-08',homeScore:null,awayScore:null}];assert.deepEqual(nextRoundFixtures({fixtures},'2026-10-26').map(m=>m.id),['next']);assert.deepEqual(nextRoundFixtures({fixtures:[]},'2026-10-26'),[]);
});
test('entrenadores: unifica nombres completos y no suma dos veces el mismo equipo',()=>{
 const rows=staffDirectory([{teamId:'a',people:[{name:'Pérez, José'},{name:'José Pérez'}]},{teamId:'b',people:[{name:'JOSE PEREZ'}]}]);assert.equal(rows.length,1);assert.deepEqual(rows[0].teamIds,['a','b']);assert.equal(sumStandings([{won:2},{won:3}]).won,5);assert.equal(sumStandings([{won:2},undefined]).won,null);
});
test('PG PE PP individual solo cuenta participación confirmada, local/visitante y datos incompletos',()=>{
 const fixtures=[{id:'a',homeId:'x',homeScore:2,awayScore:0},{id:'b',homeId:'other',homeScore:1,awayScore:2},{id:'c',homeId:'x',homeScore:0,awayScore:1},{id:'d',homeId:'x',homeScore:1,awayScore:1}];const values=playerResults([{id:'a',minutes:90},{id:'b',minutes:15},{id:'c',minutes:0},{id:'d',minutes:90},{id:'missing',minutes:null}],fixtures,'x');assert.deepEqual(values,{won:2,drawn:1,lost:0,partial:true});
});
test('preferencias de jugadores personalizadas no se sustituyen por favoritos al abrir la app',()=>{
 const {resolveDeviceTargets}=require('./notification-targets.cjs');assert.deepEqual(resolveDeviceTargets({teamSelection:'custom',teamIds:['a'],playerSelection:'custom',playerIds:['p']},['b'],['q']),{teamIds:['a'],playerIds:['p']});
});
test('administración: quita el equipo principal conservando asignaciones válidas y exige ficha del nuevo equipo al mover jugadores',async()=>{
 const fs=require('node:fs');const catalog=require('./teams.json');let saved;const db={},auth={currentUser:{uid:'admin'}},doc=(...args)=>args,updateDoc=async(ref,value)=>{saved=value};
 const source='async function adminSetProfileTeams'+fs.readFileSync('./firebase.js','utf8').split('export async function adminSetProfileTeams')[1].replace("const catalog=(await import('./teams.json')).default;",'');
 const fn=new Function('db','auth','doc','updateDoc','catalog','return ('+source+')')(db,auth,doc,updateDoc,catalog);
 const [a,b]=catalog;await fn({id:'coach',name:'Nombre',claim:{teamId:a.id,teamIds:[a.id,b.id],name:'Entrenador',role:'trainer'}},[b.id]);assert.equal(saved.claim.teamId,b.id);assert.deepEqual(saved.claim.teamIds,[b.id]);assert.equal(saved.claim.role,'trainer');
 await assert.rejects(()=>fn({id:'player',claim:{role:'player'}},[b.id],{id:'p',teamId:a.id,name:'Jugador'}),/ficha oficial/);await fn({id:'player',claim:{role:'player'}},[b.id],{id:'p',teamId:b.id,name:'Jugador'});assert.equal(saved.claim.playerId,'p');assert.equal(saved.claim.teamId,b.id);assert.deepEqual(saved.claim.teamIds,[b.id]);
});
test('actas: identifica cuerpos técnicos y jugadores por equipo, sin confundir árbitros',()=>{
 const {reportParticipants}=require('./report-participants.cjs');const data=reportParticipants({codigo_equipo_local:'a',codigo_equipo_visitante:'b',tecnicos_equipo_local:[{nombre:'Entrenador A'}],delegados_equipo_visitante:[{nombre:'Delegado B'}],jugadores_equipo_local:[{codjugador:'p',nombre:'Jugador A'}],arbitros_partido:[{nombre:'Árbitro'}]});assert.equal(data.staff.length,2);assert.equal(data.staff[0].teamId,'a');assert.deepEqual(data.players,[{teamId:'a',playerId:'p',name:'Jugador A'}]);assert.equal(data.staff.some(p=>p.name==='Árbitro'),false);
});
test('foto y códigos de entrenador no se convierten en personas; conserva foto oficial segura',()=>{const {reportParticipants}=require('./report-participants.cjs');const data=reportParticipants({codigo_equipo_local:'a',codigo_equipo_visitante:'b',entrenador_local:'Nombre Entrenador',cod_entrenador_local:'12345',foto_entrenador_local:'https://www.rffm.es/fotos/123.jpg'});assert.equal(data.staff.length,1);assert.equal(data.staff[0].name,'Nombre Entrenador');assert.equal(data.staff[0].photo,'https://www.rffm.es/fotos/123.jpg')});
