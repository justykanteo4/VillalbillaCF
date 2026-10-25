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
