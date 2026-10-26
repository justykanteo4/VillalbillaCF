const {test}=require('node:test'),assert=require('node:assert/strict');
const team=require('./teams.json').find(row=>row.id==='680163');
const matches=require('./server/match.cjs');
const html=(id,goals)=>'<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{game:{codacta:id,codigo_equipo_local:team.id,codigo_equipo_visitante:'other',equipo_local:team.name,equipo_visitante:'Rival',goles_equipo_local:Array.from({length:goals},()=>({nombre_jugador:'Jugador',minuto:'10',tipo_gol:'100'})),goles_equipo_visitante:[],tarjetas_equipo_local:[],tarjetas_equipo_visitante:[],acta_cerrada:'1'}}}})+'</script>';
test('las actas nuevas no dependen de la copia inicial y la actualización explícita vuelve a la fuente',async()=>{
 const original=global.fetch;let goals=1,calls=0;
 global.fetch=async()=>{calls++;return {ok:true,text:async()=>html('999999999991',goals)}};
 try{
  const first=await matches.matchDetails(team.id,'999999999991');assert.equal(first.goals.length,1);
  goals=2;const cached=await matches.matchDetails(team.id,'999999999991');assert.equal(cached.goals.length,1);assert.equal(calls,1);
  const fresh=await matches.matchDetails(team.id,'999999999991',{refresh:true});assert.equal(fresh.goals.length,2);assert.equal(calls,2);
  global.fetch=async()=>{throw Error('Sin red')};const offline=await matches.matchDetails(team.id,'999999999991',{refresh:true});assert.equal(offline.error,true);assert.equal(offline.goals.length,2);
 }finally{global.fetch=original}
});
test('rechaza identificadores inválidos y no entrega un acta cacheada a otro equipo',async()=>{
 const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return {ok:true,text:async()=>html('999999999992',1)}};
 try{
  assert.equal(await matches.matchDetails(team.id,'../../x'),null);assert.equal(calls,0);
  await matches.matchDetails(team.id,'999999999992');
  const other=require('./teams.json').find(row=>row.id!==team.id);
  const result=await matches.matchFixtureDetails(team.id,{id:'999999999992',homeId:other.id,awayId:'x'},other.id);
  assert.equal(result.error,true);assert(!result.goalsAvailable);assert.equal(calls,2);
 }finally{global.fetch=original}
});
test('el marcador y el resumen utilizan los resultados nuevos del acta sin convertir campos vacíos en cero',()=>{
 const {matchWithReport}=require('./match-report.cjs'),match={id:'5',homeScore:1,awayScore:0,comment:'Crónica antigua'};
 const fresh=matchWithReport(match,{id:'5',homeScore:'2',awayScore:'1'});assert.equal(fresh.homeScore,2);assert.equal(fresh.awayScore,1);assert.equal(fresh.comment,undefined);
 for(const report of [{id:'5',homeScore:'',awayScore:'1'},{id:'6',homeScore:'9',awayScore:'0'},{id:'5',homeScore:null,awayScore:1},{id:'5',homeScore:2,awayScore:1,error:true}])assert.equal(matchWithReport(match,report),match);
});
test('las actas cerradas antiguas persisten en D1 y se reutilizan sin volver a la federación',async()=>{
 const original=global.fetch;let calls=0;const rows=new Map();const db={prepare(sql){let key;return {bind(...values){key=values[0];this.values=values;return this},async first(){return rows.has(key)?{data:rows.get(key)}:null},async run(){rows.set(key,this.values[1]);return {success:true}}}}};
 global.fetch=async()=>{calls++;return {ok:true,text:async()=>html('999999999993',3)}};
 try{const fixture={id:'999999999993',date:'2025-10-01',homeId:team.id,awayId:'other'};await matches.matchFixtureDetails(team.id,fixture,team.id,{db});assert.equal(calls,1);assert.equal(rows.size,1);const data=await matches.matchFixtureDetails(team.id,fixture,team.id,{db});assert.equal(data.goals.length,3);assert.equal(calls,1);await matches.matchFixtureDetails(team.id,fixture,team.id,{db,refresh:true});assert.equal(calls,2)}finally{global.fetch=original}
});
test('plantilla conserva el partido jugado hasta un acta real del siguiente, también sin red',()=>{
 const {featuredMatch}=require('./featured-match.cjs');const fixtures=[{id:'old',date:'2026-10-25',round:7,homeScore:2,awayScore:1},{id:'next',date:'2026-11-01',round:8,homeScore:null,awayScore:null}];
 for(const report of [null,{id:'next',published:false,closed:false,referees:[{name:'Designado'}]},{id:'next',error:true}])assert.equal(featuredMatch(fixtures,'2026-10-26',report,true).match.id,'old');
 assert.equal(featuredMatch(fixtures,'2026-10-26',{id:'next',published:true},true).match.id,'next');assert.equal(featuredMatch(fixtures,'2026-10-26',{id:'next',closed:true,offline:true},true).match.id,'next');assert.equal(featuredMatch(fixtures,'2026-10-26',{id:'other',published:true},true).match.id,'old');assert.equal(featuredMatch(fixtures,'2026-10-26',null,false).match.id,'next');
});
test('cerrar el partido añade el siguiente con detalles y actualiza tres rivales sin duplicar el partido mostrado',()=>{
 const {featuredSchedule}=require('./featured-match.cjs'),{matchWithReport}=require('./match-report.cjs');let fixtures=Array.from({length:6},(_,i)=>({id:String(i),round:i+1,date:'2026-11-0'+(i+1),homeScore:null,awayScore:null}));
 const closed={id:'0',closed:true,homeScore:'2',awayScore:'1'};fixtures=fixtures.map(m=>matchWithReport(m,closed));const first=featuredSchedule(fixtures,'2026-11-01',null,true);assert.deepEqual(first.cards.map(c=>c.match.id),['0','1']);assert.deepEqual(first.rivals.map(m=>m.id),['2','3','4']);const published=featuredSchedule(fixtures,'2026-11-01',{id:'1',published:true},true);assert.deepEqual(published.cards.map(c=>c.match.id),['1']);assert.deepEqual(published.rivals.map(m=>m.id),['2','3','4']);fixtures=fixtures.map(m=>matchWithReport(m,{id:'1',closed:true,homeScore:'1',awayScore:'1'}));const second=featuredSchedule(fixtures,'2026-11-02',null,true);assert.deepEqual(second.cards.map(c=>c.match.id),['1','2']);assert.deepEqual(second.rivals.map(m=>m.id),['3','4','5']);
});
