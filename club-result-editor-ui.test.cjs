const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validScore,editableFixtures,scoreDraft}=require('./club-result-editor-ui.cjs');
test('solo permite marcadores enteros de 0 a 99',()=>{
 for(const n of ['0','1','12','99'])assert.equal(validScore(n),true,n);
 for(const n of ['', ' ', '-1','100','01','2.5','1e1','2 goles',null,undefined])assert.equal(validScore(n),false,String(n));
 assert.equal(scoreDraft(3), '3');assert.equal(scoreDraft(null),'');assert.equal(scoreDraft(-1),'');assert.equal(scoreDraft(100),'');
});
test('solo propone partidos oficiales con identificador numérico',()=>{
 const source=[{id:'123',date:'2026-10-15'},{id:'abc',date:'2026-11-15'},{id:'124',date:'2026-11-15'},{id:null,date:'2026-12-01'}];
 assert.deepEqual(editableFixtures(source).map(x=>x.id),['124','123']);
 assert.deepEqual(editableFixtures(null),[]);
});
