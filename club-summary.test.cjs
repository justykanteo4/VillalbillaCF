const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildClubSummary}=require('./club-summary.cjs');
const range={start:'2026-10-19',end:'2026-10-25'};
const match=(id,date,homeId,awayId,homeScore,awayScore)=>({id,date,homeId,awayId,homeScore,awayScore});
test('resumen global suma local y visitante, separa jornada y temporada y excluye partidos pendientes',()=>{
 const teams=[{id:'a',fixtures:[match('1','2026-10-20','a','r',3,1),match('2','2026-10-10','r','a',2,4),match('3','2026-10-25','a','r',null,null)]},{id:'b',fixtures:[match('4','2026-10-25','r','b',2,1)]}];
 const records=[{teamId:'a',id:'1',available:true,yellow:2,red:1},{teamId:'a',id:'2',available:true,yellow:1,red:0}];
 const week=buildClubSummary(teams,records,range),season=buildClubSummary(teams,records);
 assert.deepEqual([week.goalsFor,week.goalsAgainst,week.yellow,week.red,week.matches],[4,3,2,1,2]);
 assert.deepEqual([season.goalsFor,season.goalsAgainst,season.yellow,season.red,season.matches],[8,5,3,1,3]);
 assert.equal(week.cardsComplete,false);assert.equal(week.cardMatches,1);
});
test('no convierte actas no publicadas en cero y distingue un acta sin tarjetas',()=>{
 const teams=[{id:'a',error:true,fixtures:[match('1','2026-10-20','a','r',0,0)]}];
 const missing=buildClubSummary(teams,[{teamId:'a',id:'1',available:false,yellow:null,red:null}]);
 assert.equal(missing.cardMatches,0);assert.equal(missing.cardsComplete,false);assert.equal(missing.stale,true);
 assert.equal(buildClubSummary(teams,[{teamId:'a',id:'1',available:true,yellow:0,red:0}]).cardsComplete,true);
});
test('un partido entre dos equipos del club se cuenta una vez; cada equipo aporta sus propios goles y tarjetas',()=>{
 const fixture=match('derby','2026-10-20','a','b',3,2);
 const result=buildClubSummary([{id:'a',fixtures:[fixture,fixture]},{id:'b',fixtures:[fixture]}],[{teamId:'a',id:'derby',available:true,yellow:1,red:0},{teamId:'b',id:'derby',available:true,yellow:2,red:1}]);
 assert.deepEqual([result.matches,result.goalsFor,result.goalsAgainst,result.yellow,result.red,result.teamMatches],[1,5,5,3,1,2]);
});
test('el endpoint pagina las actas y suma solo las tarjetas del club, incluida segunda amarilla',async()=>{
 const news=require('./server/news.cjs'),matches=require('./server/match.cjs'),{clubStats}=require('./server/club-stats.cjs');
 const originalNews=news.groupFixtures,originalMatch=matches.matchFixtureDetails;
 const team=require('./teams.json')[0];let calls=0;
 news.groupFixtures=async()=>Array.from({length:14},(_,i)=>({...match(String(i+1),'2026-10-20',team.id,'rival',1,0),home:team.name,away:'Rival'}));
 matches.matchFixtureDetails=async()=>{calls++;return {cardsAvailable:true,error:false,cards:[{team:team.name,color:'yellow',type:'Amarilla'},{team:team.name,color:'red',type:'Segunda amarilla'},{team:'Rival',color:'red',type:'Roja'}]}};
 try{
  const first=await clubStats(team.id,0);assert.equal(first.records.length,12);assert.equal(first.nextOffset,12);assert.equal(calls,12);
  assert.deepEqual([first.records[0].yellow,first.records[0].red],[2,1]);
  const second=await clubStats(team.id,12);assert.equal(second.records.length,2);assert.equal(second.nextOffset,null);
  await clubStats(team.id,0);assert.equal(calls,14,'reutiliza la caché de actas');
 }finally{news.groupFixtures=originalNews;matches.matchFixtureDetails=originalMatch}
});
