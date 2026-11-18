const {test}=require('node:test'),assert=require('node:assert/strict'),{lineupPoints}=require('./fantasy-lineup-points.cjs'),{classicSettings}=require('./fantasy-leagues.cjs');
test('puntos por foto suman partidos y bonos de la jornada, duplican capitán y excluyen suplentes Fantasy',()=>{const selected=Array.from({length:11},(_,i)=>'p'+i),matches=[{id:'m1',teamId:'a',week:1,startsAt:10,players:[{id:'p0',played:1,win:true,goals:1}]},{id:'m2',teamId:'b',week:1,startsAt:20,players:[{id:'p0',played:1,goals:0,yellow:1,directRed:1,ownGoals:1,partial:true},{id:'bench',played:1,win:true,goals:99}]},{id:'future',teamId:'a',week:2,startsAt:30,players:[{id:'p0',played:1,win:true,goals:99}]}],awards=['mvp','idealXI'].map(kind=>({match_id:'m1',team_id:'a',player_id:'p0',kind}));const rows=lineupPoints({matches,awards,points:classicSettings.points,week:1,selected,captainId:'p0',now:25,players:[{id:'p1',teams:[{id:'a'},{id:'b'}]}]});assert.equal(rows.length,11);assert.equal(rows[0].points,14);assert.equal(rows[0].captain,true);assert.equal(rows[0].confirmedMatches,2);assert.equal(rows[0].partial,true);assert.equal(rows[1].points,0);assert.equal(rows[1].confirmedMatches,2);assert.equal(rows[2].confirmedMatches,0);assert(!rows.some(r=>r.playerId==='bench'));assert.deepEqual(lineupPoints({matches,awards,points:classicSettings.points,week:1,selected:selected.slice(0,10),captainId:'p0',now:25}),[])});

test('Club multiplier x3 applies to captain only and x2 remains the legacy default',()=>{
 const selected=Array.from({length:11},(_,i)=>'p'+i);
 const matches=[{id:'test',teamId:'a',week:1,startsAt:1,players:[{id:'p0',played:1,win:true,goals:1},{id:'p1',played:1,win:true,goals:1}]}];
 const input={matches,awards:[],week:1,selected,captainId:'p0',now:2};
 const old=lineupPoints({...input,points:classicSettings.points});
 const changed=lineupPoints({...input,points:{...classicSettings.points,captain:3}});
 assert.equal(changed[0].points,old[0].points*1.5);
 assert.equal(changed[1].points,old[1].points);
 assert.equal(lineupPoints({...input,points:{...classicSettings.points,captain:99}})[0].points,old[0].points);
});
