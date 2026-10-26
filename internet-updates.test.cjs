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
test('automaticamente comprueba al abrir, avisa y reinicia tras el plazo, sin consultas simultaneas',async()=>{const {createAutoUpdater,NOTICE_DELAY}=require('./internet-updates.cjs');let clock=0;const calls=[],states=[];const tick=createAutoUpdater({isEnabled:true,checkForUpdateAsync:async()=>{calls.push('check');return {isAvailable:true}},fetchUpdateAsync:async()=>calls.push('fetch'),reloadAsync:async()=>calls.push('reload')},{now:()=>clock,onStatus:v=>states.push(v.phase)});await Promise.all([tick(),tick()]);assert.deepEqual(calls,['check','fetch']);assert(states.includes('ready'));clock=NOTICE_DELAY-1;await tick();assert.equal(calls.length,2);clock=NOTICE_DELAY;await tick();assert.deepEqual(calls,['check','fetch','reload']);await tick();assert.equal(calls.length,3)});
test('actualizacion automatica espera a terminar de escribir y guardar, y no reinicia en segundo plano',async()=>{const {createAutoUpdater,NOTICE_DELAY}=require('./internet-updates.cjs');let clock=0,active=true,editing=true,safe=false,reloads=0;const tick=createAutoUpdater({isEnabled:true,reloadAsync:async()=>reloads++},{now:()=>clock,isActive:()=>active,isEditing:()=>editing,canReload:()=>safe,hasPending:()=>true});await tick();clock+=NOTICE_DELAY;await tick();assert.equal(reloads,0);editing=false;safe=true;active=false;clock+=NOTICE_DELAY;await tick();assert.equal(reloads,0);active=true;await tick();assert.equal(reloads,0);clock+=NOTICE_DELAY;await tick();assert.equal(reloads,1)});
test('mientras permanece abierta consulta de nuevo y si falla descarga conserva la version',async()=>{const {createAutoUpdater,AUTO_CHECK_INTERVAL}=require('./internet-updates.cjs');let clock=0,checks=0;const tick=createAutoUpdater({isEnabled:true,checkForUpdateAsync:async()=>({isAvailable:++checks>1}),fetchUpdateAsync:async()=>{throw Error('Sin red')},reloadAsync:()=>assert.fail('No debe reiniciar descarga fallida')},{now:()=>clock});await tick();clock=AUTO_CHECK_INTERVAL-1;await tick();assert.equal(checks,1);clock++;await tick();assert.equal(checks,2);await tick();assert.equal(checks,2)});
test('el guardado local pendiente o fallido impide el reinicio hasta una escritura correcta',async()=>{const {trackLocalSave,canReload,finishLocalSaves}=require('./update-save-guard.cjs');let resolve;const pending=trackLocalSave('test',new Promise(r=>resolve=r));assert(!canReload());resolve();await pending;await finishLocalSaves();assert(canReload());await assert.rejects(trackLocalSave('test',Promise.reject(Error('Disco'))));await new Promise(r=>setImmediate(r));assert(!canReload());await assert.rejects(finishLocalSaves());await trackLocalSave('test',Promise.resolve());await finishLocalSaves();assert(canReload())});
