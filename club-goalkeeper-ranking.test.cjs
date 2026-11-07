const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rankClubGoalkeepers,mergeKeeperTeam}=require('./club-goalkeeper-ranking.cjs');
const player=(id,played,cleanSheets,goalsConceded,extra={})=>({id,name:id,isGoalkeeper:true,goalkeeperPlayed:played,cleanSheets,goalsConceded,...extra});
const team=(id,players)=>({id,name:id,category:'Cadete',players});
test('coefficient leads; more appearances break ties; clean sheets do not affect position',()=>{
 const {ranked}=rankClubGoalkeepers([team('a',[player('more-clean',4,3,8),player('ratio',4,2,2),player('appearances',8,2,8),player('tie',8,0,8),player('fewer-games',4,2,4)])]);
 assert.deepEqual(ranked.map(p=>[p.id,p.rank]),[['ratio',1],['appearances',2],['tie',2],['fewer-games',4],['more-clean',5]]);
});
test('unused substitutes and unknown participation cannot lead the ranking',()=>{
 const {ranked,pending,partial}=rankClubGoalkeepers([team('a',[player('active',1,0,4),player('bench',0,0,0),player('unknown',null,null,null),{id:'outfield',name:'Outfield',played:20}])]);
 assert.deepEqual(ranked.map(p=>p.id),['active']);assert.equal(pending.length,2);assert.equal(pending.find(p=>p.id==='unknown').played,null);assert.equal(pending.find(p=>p.id==='bench').played,0);assert.equal(partial,true);
});
test('adds confirmed keeper statistics across teams by official id, without duplicate roster entries',()=>{
 const {ranked}=rankClubGoalkeepers([team('a',[player('same',2,1,3),player('same',2,1,3),player('different',1,0,2,{name:'same'})]),team('b',[player('same',3,1,2)])]);
 const row=ranked.find(p=>p.id==='same');assert.equal(row.played,5);assert.equal(row.cleanSheets,2);assert.equal(row.goalsConceded,5);assert.equal(row.teams.length,2);assert.equal(ranked.length,2);
});
test('missing team appearances are partial and never manufactured as confirmed zeroes',()=>{
 const {ranked}=rankClubGoalkeepers([team('a',[player('same',2,1,3)]),team('b',[player('same',null,null,null)])]);
 assert.equal(ranked[0].played,2);assert.equal(ranked[0].partial,true);
});
test('failed or older refresh keeps newer stored statistics and marks the record partial',()=>{
 const previous=team('a',[player('a',5,2,6,{goalkeeperUpdatedAt:'2026-11-07T10:00:00Z'})]);
 for(const replacement of [player('a',null,null,null),player('a',1,0,2,{goalkeeperUpdatedAt:'2026-11-06T10:00:00Z'})]){
  const merged=mergeKeeperTeam(previous,{players:[replacement]});assert.equal(merged.id,'a');assert.equal(merged.players[0].goalkeeperPlayed,5);assert.equal(merged.players[0].goalkeeperPartial,true);
 }
 const merged=mergeKeeperTeam(previous,{players:[player('a',6,3,6,{goalkeeperUpdatedAt:'2026-11-08T10:00:00Z'})]});assert.equal(merged.players[0].goalkeeperPlayed,6);assert.equal(merged.players[0].goalkeeperPartial,false);
});
