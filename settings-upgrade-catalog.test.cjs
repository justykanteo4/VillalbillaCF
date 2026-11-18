const {test}=require('node:test');
const assert=require('node:assert/strict');
const {groups,features}=require('./settings-upgrade-catalog.cjs');
test('Las 77 funciones acordadas están completas en el inventario y sin nuevo rol Editor',()=>{
 assert.equal(features.length,77);
 assert.deepEqual(groups.map(g=>g.items.length),[12,12,14,14,12,3,10]);
 assert.equal(new Set(features.map(f=>f.id)).size,77);
 assert(features.every(f=>f.label.length>4&&['admin','user','club'].includes(f.scope)));
 assert.equal(features.some(f=>/editor/i.test(f.label)),false);
});
test('Los ajustes personales incluyen las tres elecciones definitivas de Apariencia',()=>{
 const appearance=groups.find(g=>g.id==='appearance');
 assert.deepEqual(appearance.items,['Tema oscuro, claro o automático','Pantalla de inicio','Vista de jugadores: tarjetas o lista']);
 assert(features.filter(f=>f.scope==='admin').length===52);
 assert(features.filter(f=>f.scope==='user').length===15);
 assert(features.filter(f=>f.scope==='club').length===10);
});
