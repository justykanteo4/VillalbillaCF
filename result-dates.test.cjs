const {test}=require('node:test'),assert=require('node:assert/strict');
const {datePeriod,periodEnd,resultDateOptions,matchesByDate,toggleResultTeam}=require('./result-dates.cjs');
const teams=[{id:'a',category:'A',fixtures:[{id:'late',round:3,date:'2026-10-25',time:'18:00'},{id:'old',round:7,date:'2026-10-18'},{id:'unknown',round:5,date:null}]},{id:'b',category:'B',fixtures:[{id:'early',round:9,date:'2026-10-24',time:'12:00'},{id:'same-day',round:8,date:'2026-10-25',time:'10:00'}]}];
test('agrupa por fechas reales aunque las jornadas de equipos sean distintas y ordena por día/hora',()=>{assert.deepEqual(matchesByDate(teams,'2026-10-20').map(m=>m.id),['early','same-day','late']);assert.equal(matchesByDate([teams[1]],'2026-10-20').length,2)});
test('conserva el fin de semana hasta el lunes y cambia el martes incluso si no hay partidos',()=>{assert.equal(datePeriod('2026-10-25'),'2026-10-20');assert.equal(datePeriod('2026-10-26'),'2026-10-20');assert.equal(datePeriod('2026-10-27'),'2026-10-27');assert.equal(periodEnd('2026-10-20'),'2026-10-26');assert.deepEqual(resultDateOptions(teams,'2026-10-27'),['2026-10-13','2026-10-20','2026-10-27','undated']);assert.deepEqual(matchesByDate(teams,'undated').map(m=>m.id),['unknown']);assert.deepEqual(matchesByDate(teams,'2026-10-27'),[])});
test('selección de uno, varios o todos sin duplicar ni mezclar equipos',()=>{const ids=['a','b','c'];let s=toggleResultTeam([],'a',ids);assert.deepEqual(s,['a']);s=toggleResultTeam(s,'b',ids);assert.deepEqual(s,['a','b']);assert.deepEqual(toggleResultTeam(s,'Todos',ids),[]);assert.deepEqual(toggleResultTeam(s,'c',ids),[]);assert.deepEqual(toggleResultTeam(s,'a',ids),['b']);assert.deepEqual(toggleResultTeam(['b'],'b',ids),[])});
test('prioriza resultados incluidos 0-0 y mantiene fecha/hora dentro de cada grupo',()=>{
 const fixtures=[{id:'pending',date:'2026-10-30',time:'10:00',homeScore:null,awayScore:null},{id:'later',date:'2026-11-01',time:'12:00',homeScore:2,awayScore:1},{id:'draw',date:'2026-10-31',time:'18:00',homeScore:0,awayScore:0},{id:'partial',date:'2026-10-31',time:'12:00',homeScore:1,awayScore:null}];
 assert.deepEqual(matchesByDate([{id:'a',category:'A',fixtures}],'2026-10-27').map(m=>m.id),['draw','later','pending','partial']);
 assert.deepEqual(matchesByDate([{id:'a',category:'A',fixtures}],'2026-10-20'),[]);
});
test('tarjetas identifican categoría y letra del club sin cambiar rivales ni confundir derbis',()=>{
 const {resultTeamName}=require('./result-dates.cjs');
 assert.equal(resultTeamName("VILLALBILLA C.F. 'B'",'8941348'),'Cadete B');
 assert.equal(resultTeamName('GARENA','1234',{category:'SEGUNDA CADETE',name:"VILLALBILLA C.F. 'B'"}),'GARENA');
 assert.equal(resultTeamName("VILLALBILLA C.F. 'C'",'26724950'),'Cadete C');
 assert.equal(resultTeamName('VILLALBILLA C.F.','846518'),'Juvenil');
 assert.equal(resultTeamName("VILLALBILLA C.F. 'B'",'26724944'),'Infantil femenino B');
 assert.equal(resultTeamName("VILLALBILLA C.F. 'B'",null,{category:'SEGUNDA CADETE',name:"VILLALBILLA C.F. 'B'"}),'Cadete B');
});
