const {test}=require('node:test'),assert=require('node:assert/strict'),{lineupPoints,matchPlayerPoints,defenderCleanSheet}=require('./fantasy-lineup-points.cjs'),{classicSettings}=require('./fantasy-leagues.cjs');
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

test('portería a cero puntúa al defensa que juega y mantiene el punto del portero',()=>{
 const points={...classicSettings.points};
 const score=(homeScore,awayScore,win,draw=false)=>({id:'cero',teamId:'equipo',week:1,startsAt:1,homeScore,awayScore,players:[]});
 const defender={id:'def',played:1,win:true,draw:false,cleanSheet:false,goals:0};
 const keeper={id:'por',played:1,win:true,draw:false,cleanSheet:true,goals:0};
 const midfielder={id:'med',played:1,win:true,draw:false,cleanSheet:false,goals:0};
 const win10=score(1,0,true);
 assert.equal(defenderCleanSheet(defender,win10,'Defensa'),true);
 assert.equal(matchPlayerPoints(defender,win10,points,[],'Defensa'),points.win+points.cleanSheet);
 assert.equal(matchPlayerPoints(keeper,win10,points,[],'Portero'),points.win+points.cleanSheet);
 assert.equal(matchPlayerPoints(midfielder,win10,points,[],'Mediocentro'),points.win);
 assert.equal(matchPlayerPoints({...defender,played:0},win10,points,[],'Defensa'),0);
 assert.equal(matchPlayerPoints(defender,score(2,1,true),points,[],'Defensa'),points.win);
 assert.equal(matchPlayerPoints({...defender,win:false,draw:true},score(0,0,false,true),points,[],'Defensa'),points.draw+points.cleanSheet);
 assert.equal(matchPlayerPoints({...defender,win:false,draw:true},score(1,1,false,true),points,[],'Defensa'),points.draw);
 assert.equal(matchPlayerPoints({...defender,win:false,draw:false},score(0,1,false),points,[],'Defensa'),points.loss);
 assert.equal(matchPlayerPoints(defender,{id:'old',teamId:'equipo'},points,[],'Defensa'),points.win);
 assert.equal(matchPlayerPoints(defender,win10,points,[],'Sin posición publicada'),points.win);
});
test('el once concede bonus al defensa con posición publicada y duplica el del capitán',()=>{
 const selected=Array.from({length:11},(_,i)=>'p'+i);
 const game={id:'g',teamId:'team',week:1,startsAt:1,homeScore:3,awayScore:0,players:[
  {id:'p0',played:1,win:true,draw:false,cleanSheet:false},
  {id:'p1',played:1,win:true,draw:false,cleanSheet:false},
  {id:'p2',played:1,win:true,draw:false,cleanSheet:true},
  {id:'p3',played:0,win:true,draw:false,cleanSheet:false}
 ]};
 const players=[{id:'p0',position:'Defensa'},{id:'p1',position:'Delantero'},{id:'p2',position:'Portero'},{id:'p3',position:'Defensa'}];
 const rows=lineupPoints({matches:[game],awards:[],points:classicSettings.points,week:1,selected,captainId:'p0',now:2,players});
 assert.equal(rows[0].points,(classicSettings.points.win+classicSettings.points.cleanSheet)*2);
 assert.equal(rows[1].points,classicSettings.points.win);
 assert.equal(rows[2].points,classicSettings.points.win+classicSettings.points.cleanSheet);
 assert.equal(rows[3].points,0);
});
