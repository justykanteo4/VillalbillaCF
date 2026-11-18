const test=require('node:test'),assert=require('node:assert/strict');
const {fields,validStats,statsFromPlayer,applyStatCorrections}=require('./fantasy-stat-corrections.cjs');
const clean={goals:2,assists:1,yellow:1,red:0,ownGoals:0};
test('edits require complete bounded integer stats and ownGoals not exceeding goals',()=>{
 assert(validStats(clean));for(const value of [{...clean,goals:-1},{...clean,red:1.5},{...clean,goals:21},{...clean,ownGoals:3},{...clean,extra:2},null,[]])assert(!validStats(value));
 assert.deepEqual(fields,['goals','assists','yellow','red','ownGoals']);
});
test('overlay updates one specific player without mutating original official snapshot',()=>{
 const original={id:'100',teamId:'200',players:[{id:'300',name:'Uno',goals:0,yellow:0,partial:true},{id:'301',name:'Dos',goals:1}]};
 const matches=[original,{id:'101',teamId:'200',players:[{id:'300',goals:5}]}];
 const out=applyStatCorrections(matches,[{team_id:'200',match_id:'100',player_id:'300',stats_json:JSON.stringify(clean)}]);
 assert.equal(out[0].players[0].goals,2);assert.equal(out[0].players[0].assists,1);assert.equal(out[0].players[0].partial,true);
 assert.equal(original.players[0].goals,0);assert.equal(out[0].players[1].goals,1);assert.equal(out[1],matches[1]);
 assert.deepEqual(statsFromPlayer({goals:null,assists:2}),{goals:0,assists:2,yellow:0,red:0,ownGoals:0});
});
