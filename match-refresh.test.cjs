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
