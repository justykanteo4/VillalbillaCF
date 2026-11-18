const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseDate,validWindow,isOpen,label}=require('./fantasy-market-window-policy.cjs');
test('Calendario de mercado valida fechas reales y límites de dos años',()=>{
 assert.equal(parseDate(''),null);
 assert.equal(label(parseDate('2026-11-25')),'2026-11-25');
 for(const value of ['2026-02-30','2026-13-01','01/01/2027','2027-2-1','bad'])assert.throws(()=>parseDate(value));
 assert.doesNotThrow(()=>validWindow(parseDate('2026-11-25'),parseDate('2027-06-30')));
 assert.throws(()=>validWindow(parseDate('2027-06-30'),parseDate('2026-11-25')));
 assert.throws(()=>validWindow(parseDate('2026-01-01'),parseDate('2029-01-01')));
});
test('Los dos días de apertura y cierre están incluidos según el huso de Madrid',()=>{
 const start=parseDate('2026-11-25'),end=parseDate('2026-11-27'),window={startDay:start,endDay:end};
 assert.equal(isOpen(window,Date.parse('2026-11-24T22:59:59Z')),false);
 assert.equal(isOpen(window,Date.parse('2026-11-24T23:00:00Z')),true);
 assert.equal(isOpen(window,Date.parse('2026-11-27T22:59:59Z')),true);
 assert.equal(isOpen(window,Date.parse('2026-11-27T23:00:00Z')),false);
 assert.equal(isOpen(null,Date.now()),true);
 assert.equal(isOpen({startDay:null,endDay:null},Date.now()),true);
});
