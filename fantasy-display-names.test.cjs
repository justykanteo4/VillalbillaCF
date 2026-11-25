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

test('market listings, roster, rival names and round/table nicknames use given names first',()=>{
 const input={listings:[{name:'RODRIGUEZ MONTESINOS, DIEGO'}],roster:[{name:'ROJO CASTILLA, BRUNO'}],rivals:[{name:'GARCIA GARCIA, ALVARO',players:[{name:'SANCHEZ GARCIA, ENZO'}]},{name:'Paco Jones',players:[]}],rows:[{nickname:'GONZÁLEZ YEBRA, JORGE',total:68},{nickname:'Rulo',total:53}]};
 const result=fantasyDisplayNames(input);
 assert.equal(result.listings[0].name,'DIEGO RODRIGUEZ MONTESINOS');
 assert.equal(result.roster[0].name,'BRUNO ROJO CASTILLA');
 assert.equal(result.rivals[0].name,'ALVARO GARCIA GARCIA');
 assert.equal(result.rivals[0].players[0].name,'ENZO SANCHEZ GARCIA');
 assert.equal(result.rivals[1].name,'Paco Jones');
 assert.equal(result.rows[0].nickname,'JORGE GONZÁLEZ YEBRA');
 assert.equal(result.rows[1].nickname,'Rulo');
 assert.equal(result.rows[0].total,68);
 assert.deepEqual(fantasyDisplayNames(result),result);
});
