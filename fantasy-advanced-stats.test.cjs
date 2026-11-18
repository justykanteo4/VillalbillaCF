const test=require('node:test'),assert=require('node:assert/strict');
const {advancedStats}=require('./fantasy-advanced-stats.cjs');
test('sin jornadas no inventa datos',()=>{assert.deepEqual(advancedStats([]),{count:0,average:null,best:null,worst:null,lastFive:[],positive:0,trend:null})});
test('ordena jornadas y calcula media y evolución',()=>{const d=advancedStats([{week:3,date:'2026-11-20',points:4},{week:1,date:'2026-11-06',points:12},{week:2,date:'2026-11-13',points:-2}]);assert.equal(d.average,4.7);assert.equal(d.best.points,12);assert.equal(d.worst.points,-2);assert.deepEqual(d.lastFive,[12,-2,4]);assert.equal(d.trend,6);assert.equal(d.positive,2)});
test('ignora jornadas sin puntos confirmados',()=>{const d=advancedStats([{week:1,date:'2026-11-06',points:null},{week:2,date:'2026-11-13',points:0},{week:3,date:'2026-11-20'}]);assert.equal(d.count,1);assert.equal(d.average,0);assert.equal(d.trend,null)});
