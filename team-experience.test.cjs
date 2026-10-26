const {test}=require('node:test'),assert=require('node:assert/strict');
const {trainerTeams,currentRound,calendarOrder,detectPlayer}=require('./team-experience.cjs');
test('equipos de entrenador: migra una ficha antigua y admite varios sin conceder acceso a jugadores',()=>{
 assert.deepEqual(trainerTeams({claim:{teamId:'a'}}),['a']);assert.deepEqual(trainerTeams({claim:{teamId:'a',teamIds:['a','b','b']}}),['a','b']);assert.deepEqual(trainerTeams({claim:{role:'player',teamId:'a',teamIds:['b']}}),[]);
});
test('calendario: primero la jornada de esta semana, incluso después del partido; conserva anteriores y futuras',()=>{
 const rows=[{id:'old',round:1,date:'2026-10-18'},{id:'current',round:2,date:'2026-10-25'},{id:'next',round:3,date:'2026-11-01'}];
 assert.equal(currentRound(rows,'2026-10-25'),2);assert.deepEqual(calendarOrder(rows,'2026-10-25').map(m=>m.id),['current','old','next']);assert.equal(currentRound(rows,'2026-10-26'),3);
});
test('jornada en descanso y al terminar la temporada usa próxima o última; sin fechas conserva orden',()=>{
 assert.equal(currentRound([{round:3,date:'2026-11-01'}],'2026-10-26'),3);assert.equal(currentRound([{round:3,date:'2026-11-01'}],'2027-01-01'),3);assert.equal(currentRound([],'2026-10-26'),null);
});
test('doble rol: exige nombre completo coincidente y ficha única, no adivina por nombre de pila',()=>{
 const rows=[{id:'1',name:'PÉREZ GARCÍA, José',teamId:'a'},{id:'1',name:'José Pérez García',teamId:'b'}];assert.equal(detectPlayer('José Pérez García',rows).id,'1');assert.equal(detectPlayer('José',rows),null);assert.equal(detectPlayer('José Pérez García',[...rows,{id:'2',name:'José Pérez García'}]),null);assert.equal(detectPlayer('Ana Pérez',rows),null);
});
test('calendario incremental guarda la temporada una vez, actualiza solo jornada actual y conserva lo anterior sin red',async()=>{
 const fs=require('node:fs');const copies=new Map(),calls=[];let offline=false;const old={id:'1',round:1,date:'2026-10-18',homeScore:null,awayScore:null},now={id:'2',round:2,date:'2026-10-26',homeScore:null,awayScore:null};
 global.__calendarTest={api:async path=>{calls.push(path);if(offline)throw Error('sin red');return {id:'a',fixtures:path.includes('current=1')?[{...now,time:'19:00'}]:[old,now]}},readCopy:async k=>copies.get(k),saveCopy:async(k,data)=>copies.set(k,{data}),currentRound};
 try{const source=fs.readFileSync('./team-calendar.js','utf8').replace("import {api} from './api';","const {api}=globalThis.__calendarTest;").replace("import {readCopy,saveCopy} from './offline';","const {readCopy,saveCopy}=globalThis.__calendarTest;").replace("import {currentRound} from './team-experience.cjs';","const {currentRound}=globalThis.__calendarTest;");const {loadTeamCalendar}=await import('data:text/javascript,'+encodeURIComponent(source));
 assert.equal((await loadTeamCalendar('a')).fixtures.length,2);assert(!calls[0].includes('current=1'));const second=await loadTeamCalendar('a');assert(calls[1].includes('current=1'));assert.equal(second.fixtures[0].id,'1');assert.equal(second.fixtures[1].time,'19:00');offline=true;const fallback=await loadTeamCalendar('a');assert.equal(fallback.error,true);assert.equal(fallback.fixtures.length,2);assert.equal(fallback.fixtures[1].time,'19:00');
 }finally{delete global.__calendarTest}
});
test('un administrador no recibe automáticamente todos los equipos como equipos de trabajo',()=>{assert.deepEqual(trainerTeams({status:'admin',claim:null}),[]);assert.deepEqual(trainerTeams({status:'admin',claim:{role:'trainer',teamId:'a',teamIds:['a','b']}}),['a','b'])});
