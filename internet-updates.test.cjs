const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createForegroundUpdater,CHECK_INTERVAL}=require('./internet-updates.cjs');
test('espera entre consultas, descarga mejoras y nunca reinicia la app mientras se edita',async()=>{
 let clock=0,checks=0,downloads=0;
 const check=createForegroundUpdater({isEnabled:true,checkForUpdateAsync:async()=>{checks++;return {isAvailable:true}},fetchUpdateAsync:async()=>{downloads++},reloadAsync:()=>assert.fail('No debe interrumpir la app')},{now:()=>clock});
 await check();assert.equal(checks,0);clock=CHECK_INTERVAL;await Promise.all([check(),check()]);assert.equal(checks,1);assert.equal(downloads,1);
 await check();assert.equal(checks,1);
});
test('sin conexión conserva la versión y permite reintentar más tarde',async()=>{
 let clock=0,calls=0;
 const check=createForegroundUpdater({isEnabled:true,checkForUpdateAsync:async()=>{calls++;throw Error('Sin red')}},{now:()=>clock});
 clock=CHECK_INTERVAL;await check();await check();assert.equal(calls,1);clock+=CHECK_INTERVAL;await check();assert.equal(calls,2);
});
test('no consulta en segundo plano ni con actualizaciones desactivadas',async()=>{
 let clock=0;
 for(const enabled of [true,false]){
  const check=createForegroundUpdater({isEnabled:enabled,checkForUpdateAsync:()=>assert.fail('No debe consultar')},{now:()=>clock,isActive:()=>false});
  clock+=CHECK_INTERVAL;await check();
 }
});
test('actualizar manualmente comprueba, descarga y reinicia sin otro botón',async()=>{const {manualUpdate}=require('./internet-updates.cjs'),calls=[];assert.equal(await manualUpdate({isEnabled:true,checkForUpdateAsync:async()=>{calls.push('check');return {isAvailable:true}},fetchUpdateAsync:async()=>calls.push('fetch'),reloadAsync:async()=>calls.push('reload')}),'installed');assert.deepEqual(calls,['check','fetch','reload'])});
test('una mejora pendiente se aplica; sin mejoras o sin conexión no se reinicia',async()=>{const {manualUpdate}=require('./internet-updates.cjs');let reloads=0;const service={isEnabled:true,checkForUpdateAsync:async()=>({isAvailable:false}),reloadAsync:async()=>reloads++};assert.equal(await manualUpdate(service),'current');assert.equal(reloads,0);assert.equal(await manualUpdate(service,{pending:true}),'installed');assert.equal(reloads,1);await assert.rejects(()=>manualUpdate({...service,checkForUpdateAsync:async()=>({isAvailable:true}),fetchUpdateAsync:async()=>{throw Error('Sin red')}}),/Sin red/);assert.equal(reloads,1)});
