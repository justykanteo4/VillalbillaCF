const test=require('node:test'),assert=require('node:assert/strict');
const {fantasyDisplayNames}=require('./fantasy-display-names.cjs');
const {orderFantasyRows}=require('./fantasy-list-order.cjs');
test('nombres propios primero en jugadores, entrenadores, cartas y movimientos guardados',()=>{
 const original={name:'Liga, Aficionado',players:[{id:'1',name:'PINO ADÁN, ALEJANDRO'},
  {id:'2',name:'DE LA CRUZ, JUAN CARLOS'},{id:'3',name:'Ron'}],
 manager:{id:'c',name:'GARCÍA, JOSÉ'},matches:[{players:[{name:'MUÑOZ, ANA'}]}],
 transactions:[{playerName:'PINO ADÁN, ALEJANDRO',amount:26.91}],rivals:[{name:'Los Rojos, FC'}]};
 const value=fantasyDisplayNames(original);
 assert.equal(value.players[0].name,'ALEJANDRO PINO ADÁN');
 assert.equal(value.players[1].name,'JUAN CARLOS DE LA CRUZ');
 assert.equal(value.players[2].name,'Ron');
 assert.equal(value.manager.name,'JOSÉ GARCÍA');
 assert.equal(value.matches[0].players[0].name,'ANA MUÑOZ');
 assert.equal(value.transactions[0].playerName,'ALEJANDRO PINO ADÁN');
 assert.equal(value.name,original.name);
 assert.equal(value.rivals[0].name,original.rivals[0].name);
 assert.equal(original.players[0].name,'PINO ADÁN, ALEJANDRO');
 assert.deepEqual(fantasyDisplayNames(value),value);
 assert.equal(orderFantasyRows([{name:'A, ZOE'},{name:'Z, ANA'}],'name')[0].name,'Z, ANA');
});
