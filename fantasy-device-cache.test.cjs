const {test}=require('node:test'),assert=require('node:assert/strict'),{createFantasyCache}=require('./fantasy-device-cache.cjs');
function fixture(){const rows=new Map();let time=100000;const deps={now:()=>time,read:async k=>rows.get(k),save:async(k,data,savedAt)=>rows.set(k,{data,savedAt:savedAt||new Date(time).toISOString()})};return {rows,deps,request:createFantasyCache(deps),advance:n=>time+=n}}
test('Fantasy persiste por cuenta, presenta copia antes de red y reutiliza datos recientes',async()=>{const f=fixture();let calls=0;await f.request('a','/leagues',{},async()=>({value:++calls}));assert.equal((await f.request('a','/leagues',{},()=>{throw Error('no red')})).value,1);f.advance(16000);const order=[];const restarted=createFantasyCache(f.deps);const data=await restarted('a','/leagues',{onCached:d=>order.push(d.value)},async()=>{order.push('red');return {value:2}});assert.deepEqual(order,[1,'red']);assert.equal(data.value,2);assert.equal((await f.request('b','/leagues',{},async()=>({value:9}))).value,9)});
test('una operación invalida las copias incluso al reiniciar; no oculta denegaciones',async()=>{const f=fixture();await f.request('a','/leagues',{},async()=>({value:1}));await f.request('a','/leagues/x/bid',{method:'POST'},async()=>({saved:true}));let shown=false;await createFantasyCache(f.deps)('a','/leagues',{onCached:()=>shown=true},async()=>({value:2}));assert(!shown);f.advance(16000);await assert.rejects(f.request('a','/leagues',{},async()=>{throw Object.assign(Error('denegado'),{status:403})}),/denegado/);await assert.rejects(createFantasyCache(f.deps)('a','/leagues',{},async()=>{throw Error('sin red')}),/sin red/);await f.request('a','/leagues',{},async()=>({value:3}));f.advance(16000);assert.equal((await f.request('a','/leagues',{},async()=>{throw Error('sin red')})).offline,true)});
test('lecturas concurrentes comparten red y una lectura antigua no restaura saldo tras una puja',async()=>{const f=fixture();let resolve,calls=0;const fetch=()=>{calls++;return calls===1?new Promise(r=>resolve=r):Promise.resolve({fresh:true})};const a=f.request('a','/leagues',{},fetch),b=f.request('a','/leagues',{},fetch);await new Promise(r=>setImmediate(r));assert.equal(calls,1);await f.request('a','/leagues/x/bid',{method:'POST'},async()=>({saved:true}));resolve({old:true});const result=await Promise.all([a,b]);assert(result.every(d=>d.fresh));assert.deepEqual(f.rows.get('fantasy.private.v1.a./leagues').data,{fresh:true})});

test('identidad guardada abre antes de red tras reinicio y se separa por cuenta y estado aprobado',async()=>{
 const f=fixture();await f.request('a','/preview',{scope:'approved:team1'},async()=>({rules:{},canPlay:true,disabled:false}));f.advance(60000);
 const restarted=createFantasyCache(f.deps);let finish;const order=[];
 const load=restarted('a','/preview',{scope:'approved:team1',onCached:d=>order.push(d.canPlay?'guardada':'denegada')},()=>{order.push('red');return new Promise(r=>finish=r)});
 await new Promise(r=>setImmediate(r));assert.deepEqual(order,['guardada','red']);finish({rules:{},canPlay:false,disabled:true});assert.equal((await load).disabled,true);
 let exposed=false;await restarted('b','/preview',{scope:'approved:team1',onCached:()=>exposed=true},async()=>({canPlay:false}));assert.equal(exposed,false);
 await restarted('a','/preview',{scope:'pending:team1',onCached:()=>exposed=true},async()=>({canPlay:false}));assert.equal(exposed,false);
});
test('identidad offline persiste; una denegación no reaparece en la siguiente apertura',async()=>{
 const f=fixture(),options={scope:'approved'};await f.request('a','/preview',options,async()=>({rules:{},canPlay:true}));f.advance(60000);
 assert.equal((await createFantasyCache(f.deps)('a','/preview',options,async()=>{throw Error('sin red')})).offline,true);
 await assert.rejects(f.request('a','/preview',options,async()=>{throw Object.assign(Error('revocado'),{status:403})}),/revocado/);
 let shown=false;await createFantasyCache(f.deps)('a','/preview',{...options,onCached:()=>shown=true},async()=>({canPlay:false}));assert.equal(shown,false);
});
test('la consulta real muestra copia antes de renovar token y descarta una sesión cambiada',async()=>{
 const f=fixture();await f.request('a','/preview',{},async()=>({rules:{},canPlay:true}));f.advance(60000);
 const fs=require('node:fs'),source=fs.readFileSync('FantasyLeagues.js','utf8').split('export async function fantasyRequest')[1].split('\nexport {default}')[0];
 let resolveToken,network=0;const auth={currentUser:{uid:'a',getIdToken:()=>new Promise(r=>resolveToken=r)}};
 const request=new Function('auth','cachedFantasy','api','return async function fantasyRequest'+source)(auth,createFantasyCache(f.deps),async()=>{network++;return {rules:{},canPlay:true}});
 let shown=false;const load=request('/preview',{onCached:()=>shown=true});await new Promise(r=>setImmediate(r));assert.equal(shown,true);assert.equal(network,0);
 auth.currentUser={uid:'b'};resolveToken('test-token');await assert.rejects(load,/cuenta ha cambiado/);assert.equal(network,0);
});
