const {test}=require('node:test');
const assert=require('node:assert/strict');
const {MEDALS,sanitizeStars,medalsFor}=require('./kids-medals.cjs');
test('estrellas locales aceptan solo enteros válidos dentro de límites',()=>{
 assert.equal(sanitizeStars(undefined),0);
 assert.equal(sanitizeStars('25'),25);
 assert.equal(sanitizeStars(-10),0);
 assert.equal(sanitizeStars(Infinity),0);
 assert.equal(sanitizeStars(1000000),9999);
 assert.equal(sanitizeStars(1.9),1);
});
test('medallas se desbloquean progresivamente sin ranking ni datos personales',()=>{
 assert.equal(medalsFor(0).filter(m=>m.unlocked).length,0);
 assert.equal(medalsFor(1).filter(m=>m.unlocked).length,1);
 assert.equal(medalsFor(15).filter(m=>m.unlocked).length,3);
 assert.equal(medalsFor(60).filter(m=>m.unlocked).length,MEDALS.length);
 for(const medal of MEDALS)assert.ok(Object.keys(medal).every(key=>['id','stars','icon','title','description'].includes(key)));
});
