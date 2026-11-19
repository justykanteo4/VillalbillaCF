import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleKidsSettings} from './club-kids-settings.mjs';
function memory(){
 let row={enabled:1,revision:1,updatedAt:0};
 const db={prepare(sql){let params;return {bind(...args){params=args;return this},async first(){return row},async run(){if(params[3]!==row.revision)return {meta:{changes:0}};row={enabled:params[0],revision:row.revision+1,updatedAt:params[1]};return {meta:{changes:1}}}}}};
 return {CHAT_DB:db};
}
const req=(path,method='GET',body)=>new Request('https://app.example'+path,{method,...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})});
test('ajuste público KIDS visible sin identidad y sin datos personales',async()=>{const r=await handleKidsSettings(req('/api/kids/settings'),memory());assert.equal(r.status,200);assert.deepEqual(Object.keys(await r.json()).sort(),['enabled','revision','updatedAt'])});
test('solo el club modifica el estado y el guardado evita escrituras antiguas',async()=>{const env=memory(),authorize=async()=> 'admin';const post=(enabled,revision)=>handleKidsSettings(req('/api/admin/kids/settings','POST',{enabled,revision}),env,{authorize});let r=await post(false,1);assert.equal((await r.json()).enabled,false);r=await post(true,1);assert.equal(r.status,409);r=await handleKidsSettings(req('/api/kids/settings'),env);assert.equal((await r.json()).enabled,false)});
test('no permite desactivar KIDS sin ser administrador',async()=>{const env=memory();const r=await handleKidsSettings(req('/api/admin/kids/settings','POST',{enabled:false,revision:1}),env,{authorize:async()=>{throw Object.assign(Error('Prohibido'),{status:403})}});assert.equal(r.status,403);assert.equal((await(await handleKidsSettings(req('/api/kids/settings'),env)).json()).enabled,true)});
