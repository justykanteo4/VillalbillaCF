const {test}=require('node:test');
const assert=require('node:assert/strict');
const {seasonFromDate,groupSeasonRounds,seasonSummary}=require('./fantasy-season-history.cjs');
test('temporada española de agosto a julio, sin fechas inválidas',()=>{
 assert.equal(seasonFromDate('2026-08-01'),'2026/27');
 assert.equal(seasonFromDate('2027-07-31'),'2026/27');
 assert.equal(seasonFromDate('2027-08-01'),'2027/28');
 assert.equal(seasonFromDate('2026-02-29'),null);
 assert.equal(seasonFromDate('2026-13-01'),null);
});
test('agrupa por temporada sin inventar jornadas',()=>{
 const result=groupSeasonRounds([{week:1,date:'2026-05-10'},{week:2,date:'2026-09-01'},{week:3,date:'2026-09-08'}]);
 assert.deepEqual(result.map(s=>s.season),['2026/27','2025/26']);
 assert.deepEqual(result[0].rounds.map(r=>r.week),[3,2]);
});
test('clasificación histórica respeta empates e ignora puntuaciones pendientes',()=>{
 const rows=[
  {nickname:'A',rounds:[{date:'2026-09-01',points:5},{date:'2026-09-08',points:null},{date:'2026-02-01',points:100}]},
  {nickname:'B',rounds:[{date:'2026-09-01',points:5}]},
  {nickname:'C',rounds:[{date:'2026-09-01',points:2}]}
 ];
 const ranked=seasonSummary(rows,'2026/27');
 assert.deepEqual(ranked.map(x=>[x.nickname,x.rank,x.points]),[['A',1,5],['B',1,5],['C',3,2]]);
});
