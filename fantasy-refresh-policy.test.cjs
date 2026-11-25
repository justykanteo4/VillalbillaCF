const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fantasyRefreshAge}=require('./fantasy-refresh-policy.cjs');
const {createFantasyCache}=require('./fantasy-device-cache.cjs');

test('los intervalos Fantasy elegidos son específicos por categoría',()=>{
 const minute=60000;
 const cases={
  '/inbox':2*minute,
  '/leagues/liga1/market':2*minute,
  '/leagues/liga1/search?position=DEF':10*minute,
  '/leagues/liga1/alerts':2*minute,
  '/leagues/liga1/squad':5*minute,
  '/leagues/liga1/lineup':5*minute,
  '/leagues/liga1/transactions':5*minute,
  '/leagues/liga1/table':30*minute,
  '/leagues/liga1/rivals':15*minute,
  '/leagues/liga1/players':30*minute,
  '/leagues/liga1/coaches':60*minute,
  '/leagues/liga1/market-history':60*minute,
  '/preview':15000,
  '/leagues':15000
 };
 for(const [path,age] of Object.entries(cases))assert.equal(fantasyRefreshAge(path),age,path);
});

test('mantiene los datos hasta el intervalo y vuelve a consultar después',async()=>{
 let clock=100000,calls=0;
 const rows=new Map();
 const c=createFantasyCache({
  now:()=>clock,
  read:async key=>rows.get(key),
  save:async(key,data,savedAt)=>rows.set(key,{data,savedAt}),
  maxAgeForPath:fantasyRefreshAge
 });
 const get=()=>c('coach','/leagues/league1/market',{},async()=>({version:++calls}));
 assert.equal((await get()).version,1);
 clock+=60000;
 assert.equal((await get()).version,1);
 assert.equal(calls,1);
 clock+=60001;
 assert.equal((await get()).version,2);
 assert.equal(calls,2);
});

test('las operaciones económicas nunca se sirven de la caché y la invalidan',async()=>{
 let clock=100000,calls=0;
 const rows=new Map();
 const c=createFantasyCache({
  now:()=>clock,
  read:async key=>rows.get(key),
  save:async(key,data,savedAt)=>rows.set(key,{data,savedAt}),
  maxAgeForPath:fantasyRefreshAge
 });
 const read=()=>c('coach','/leagues/league1/squad',{},async()=>({balance:100+ ++calls}));
 assert.equal((await read()).balance,101);
 await c('coach','/leagues/league1/bid',{method:'POST'},async()=>({accepted:true}));
 assert.equal((await read()).balance,102);
});

test('Rivales vuelve a consultar en primer plano aunque la copia sea reciente',async()=>{
 let clock=500000,calls=0;
 const rows=new Map();
 const cache=createFantasyCache({
  now:()=>clock,
  read:async key=>rows.get(key),
  save:async(key,data,savedAt)=>rows.set(key,{data,savedAt}),
  maxAgeForPath:fantasyRefreshAge
 });
 const path='/leagues/liga1/rivals';
 const get=options=>cache('user',path,options,async()=>({ownerVersion:++calls}));
 assert.equal((await get({})).ownerVersion,1);
 clock+=30000;
 assert.equal((await get({})).ownerVersion,1,'La copia reciente se reutiliza en navegación habitual');
 assert.equal((await get({cache:'reload'})).ownerVersion,2,'La reactivación fuerza consulta de dueños actuales');
 assert.equal((await get({})).ownerVersion,2);
});
test('Rivales evita que una respuesta anterior sobrescriba una actualización explícita',async()=>{
 let clock=700000,finish;
 const rows=new Map();
 const cache=createFantasyCache({
  now:()=>clock,
  read:async key=>rows.get(key),
  save:async(key,data,savedAt)=>rows.set(key,{data,savedAt}),
  maxAgeForPath:fantasyRefreshAge
 });
 const path='/leagues/liga1/rivals';
 let count=0;
 const fetcher=()=>++count===1?new Promise(resolve=>{finish=resolve}):Promise.resolve({owner:'nuevo'});
 const initial=cache('user',path,{},fetcher);
 await new Promise(resolve=>setImmediate(resolve));
 // The cache deduplicates the same in-flight read; the UI sequence guard ignores older responses.
 assert.equal(count,1);
 finish({owner:'original'});
 assert.equal((await initial).owner,'original');
 clock+=30000;
 assert.equal((await cache('user',path,{cache:'reload'},fetcher)).owner,'nuevo');
});
