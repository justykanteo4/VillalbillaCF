const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildClubSummary}=require('./club-summary.cjs');
const range={start:'2026-10-19',end:'2026-10-25'};
const match=(id,date,homeId,awayId,homeScore,awayScore)=>({id,date,homeId,awayId,homeScore,awayScore});
test('resumen global suma local y visitante, separa jornada y temporada y excluye partidos pendientes',()=>{
 const teams=[{id:'a',fixtures:[match('1','2026-10-20','a','r',3,1),match('2','2026-10-10','r','a',2,4),match('3','2026-10-25','a','r',null,null)]},{id:'b',fixtures:[match('4','2026-10-25','r','b',2,1)]}];
 const records=[{teamId:'a',id:'1',available:true,closed:true,yellow:2,red:1},{teamId:'a',id:'2',available:true,closed:true,yellow:1,red:0}];
 const week=buildClubSummary(teams,records,range),season=buildClubSummary(teams,records);
 assert.deepEqual([week.goalsFor,week.goalsAgainst,week.yellow,week.red,week.matches],[4,3,2,1,2]);
 assert.deepEqual([season.goalsFor,season.goalsAgainst,season.yellow,season.red,season.matches],[8,5,3,1,3]);
 assert.equal(week.cardsComplete,false);assert.equal(week.cardMatches,1);
});
test('no convierte actas no publicadas en cero y distingue un acta sin tarjetas',()=>{
 const teams=[{id:'a',error:true,fixtures:[match('1','2026-10-20','a','r',0,0)]}];
 const missing=buildClubSummary(teams,[{teamId:'a',id:'1',available:false,yellow:null,red:null}]);
 assert.equal(missing.cardMatches,0);assert.equal(missing.cardsComplete,false);assert.equal(missing.stale,true);
 assert.equal(buildClubSummary(teams,[{teamId:'a',id:'1',available:true,closed:true,yellow:0,red:0}]).cardsComplete,true);
});
test('PG, PE y PP respetan local/visitante y no incluyen partidos pendientes o duplicados',()=>{
 const fixtures=[match('1','2026-10-20','a','r',3,1),match('2','2026-10-21','r','a',0,2),match('3','2026-10-22','a','r',0,0),match('4','2026-10-23','a','r',0,1),match('5','2026-10-24','r','a',2,0),match('6','2026-10-25','a','r',null,null)];
 const total=buildClubSummary([{id:'a',fixtures:[...fixtures,fixtures[0]]}],[]);
 assert.deepEqual([total.won,total.drawn,total.lost],[2,1,2]);assert.equal(total.won+total.drawn+total.lost,total.teamMatches);
});
test('un partido entre dos equipos del club se cuenta una vez; cada equipo aporta sus propios goles y tarjetas',()=>{
 const fixture=match('derby','2026-10-20','a','b',3,2);
 const result=buildClubSummary([{id:'a',fixtures:[fixture,fixture]},{id:'b',fixtures:[fixture]}],[{teamId:'a',id:'derby',available:true,closed:true,yellow:1,red:0},{teamId:'b',id:'derby',available:true,closed:true,yellow:2,red:1}]);
 assert.deepEqual([result.matches,result.goalsFor,result.goalsAgainst,result.yellow,result.red,result.teamMatches],[1,5,5,3,1,2]);
 assert.deepEqual([result.won,result.drawn,result.lost],[1,0,1]);
});
test('el endpoint usa lotes de tres, reutiliza D1 y suma solo las tarjetas del club',async()=>{
 const news=require('./server/news.cjs'),matches=require('./server/match.cjs'),{clubStats}=require('./server/club-stats.cjs');
 const originalNews=news.groupFixtures,originalMatch=matches.matchFixtureDetails,team=require('./teams.json')[0],db={marker:true};let calls=0;
 news.groupFixtures=async()=>Array.from({length:7},(_,i)=>({...match(String(i+1),'2026-10-20',team.id,'rival',1,0),home:team.name,away:'Rival'}));
 matches.matchFixtureDetails=async(id,fixture,participant,options)=>{calls++;assert.equal(options.db,db);return {id:fixture.id,closed:true,cardsAvailable:true,error:false,cards:[{team:team.name,color:'yellow',type:'Amarilla'},{team:team.name,color:'red',type:'Segunda amarilla'},{team:'Rival',color:'red',type:'Roja'}]}};
 try{let offset=0,records=[];do{const page=await clubStats(team.id,offset,db);assert(page.records.length<=3);records.push(...page.records);offset=page.nextOffset}while(offset!==null);assert.equal(calls,7);assert.equal(records.length,7);assert.deepEqual([records[0].yellow,records[0].red],[2,1]);await clubStats(team.id,0,db);assert.equal(calls,7)}finally{news.groupFixtures=originalNews;matches.matchFixtureDetails=originalMatch}
});
test('un fallo individual no descarta las demás actas y un fallo de calendario conserva la página anterior',async()=>{
 const news=require('./server/news.cjs'),matches=require('./server/match.cjs'),{clubStats}=require('./server/club-stats.cjs'),team=require('./teams.json')[1],originalNews=news.groupFixtures,originalMatch=matches.matchFixtureDetails,originalNow=Date.now;let now=originalNow(),failOne=true,failCalendar=false;Date.now=()=>now;const ids=['991','992','993'];
 news.groupFixtures=async()=>{if(failCalendar)throw Error('Sin calendario');return ids.map(id=>({...match(id,'2026-10-20',team.id,'rival',1,0),home:team.name,away:'Rival'}))};matches.matchFixtureDetails=async(teamId,fixture,participant,options)=>{assert.equal(options.refresh,true);if(fixture.id==='991'&&failOne)throw Error('Una fuente falla');return {id:fixture.id,closed:true,cardsAvailable:true,cards:[{team:team.name,color:'yellow'}],updatedAt:new Date(now).toISOString()}};
 try{const first=await clubStats(team.id,0,null,{pending:ids});assert.equal(first.records.filter(r=>r.available).length,2);failOne=false;now+=31000;const fresh=await clubStats(team.id,0,null,{pending:ids});assert.equal(fresh.records.filter(r=>r.available).length,3);now+=301000;failCalendar=true;const offline=await clubStats(team.id,0,null,{pending:ids});assert.equal(offline.error,true);assert.equal(offline.records.filter(r=>r.available).length,3)}finally{news.groupFixtures=originalNews;matches.matchFixtureDetails=originalMatch;Date.now=originalNow}
});
