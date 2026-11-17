import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const values=new Map();
globalThis.__cacheTestStorage={
  async getItem(k){return values.get(k)??null},
  async setItem(k,v){values.set(k,v)},
  async getAllKeys(){return [...values.keys()]},
  async multiGet(keys){return keys.map(k=>[k,values.get(k)??null])},
  async multiRemove(keys){keys.forEach(k=>values.delete(k))}
};
const source=readFileSync(new URL('./official-cache.js',import.meta.url),'utf8')
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';",
    'const AsyncStorage=globalThis.__cacheTestStorage;');
const {cachedOfficialGet,clearOfficialCache}=await import('data:text/javascript,'+encodeURIComponent(source));
let requests=0;
const network=()=>{requests++;return {rows:[{points:12}]}};
const url='/api/standings?team=680163';
assert.deepEqual(await cachedOfficialGet(url,network),{rows:[{points:12}]});
assert.deepEqual(await cachedOfficialGet(url,network),{rows:[{points:12}]});
assert.equal(requests,1,'same fresh result must avoid second network request');
await cachedOfficialGet(url,network,{forceRefresh:true});
assert.equal(requests,2,'forced refresh must contact network');
assert.deepEqual(await cachedOfficialGet(url,()=>{throw Error('network down')},{forceRefresh:true}),{rows:[{points:12}]},'offline fallback');
const market='/api/fantasy/market';
await cachedOfficialGet(market,network);await cachedOfficialGet(market,network);
assert.equal(requests,4,'market must never be cached');
await clearOfficialCache();
assert.equal(values.size,0,'clear must only remove official cache keys');
console.log('Official cache: reuse, forced refresh, offline and market isolation OK.');
