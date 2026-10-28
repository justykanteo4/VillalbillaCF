globalThis.__goalkeeperTest=require('./goalkeeper-stats.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {resolveDeviceTargets,matchesNotification}=require('./notification-targets.cjs');
let instance=0;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve}};
async function client(t,fetcher,entries=[]){
 const original=global.fetch,copies=new Map(entries),reads=[],events=[];global.__diagnosticTest=event=>events.push(event);
 global.fetch=fetcher;
 global.__localDataTest={readCopy:async key=>{reads.push(key);return copies.get(key)},saveCopy:async(key,data)=>{copies.set(key,{data,savedAt:new Date().toISOString()})}};
 const source=fs.readFileSync('./api.js','utf8')
  .replace("import {sumGoalkeepers} from './goalkeeper-stats.cjs';","const {sumGoalkeepers}=globalThis.__goalkeeperTest;").replace("import {readCopy,saveCopy} from './offline';","const {readCopy,saveCopy}=globalThis.__localDataTest;")
  .replace("import {recordDiagnostic} from './diagnostics';","const recordDiagnostic=globalThis.__diagnosticTest;")
  .replace("import {Platform} from 'react-native';","const Platform={OS:'web'};");
 const {api}=await import('data:text/javascript,'+encodeURIComponent(source+'\n// Instance '+instance++));
 t.after(()=>{global.fetch=original;delete global.__localDataTest});
 return {api,copies,reads,events};
}
const stale=data=>({savedAt:new Date(Date.now()-120000).toISOString(),data});
const response=data=>({ok:true,json:async()=>data});

test('muestra la copia antes de que responda la red, actualiza la pantalla y deduplica la consulta', {timeout:3000},async t=>{
 const network=deferred(),updated=deferred();let calls=0;
 const {api,copies}=await client(t,()=>{calls++;return network.promise},[['/api/news',stale({teams:[{id:'old'}]})]]);
 const first=await api('/api/news',{onUpdate:updated.resolve});
 const second=await api('/api/news');
 assert.equal(first.teams[0].id,'old');assert.equal(first.fromCache,true);assert.equal(second.teams[0].id,'old');assert.equal(calls,1);
 network.resolve(response({teams:[{id:'new'}]}));
 assert.equal((await updated.promise).teams[0].id,'new');
 assert.equal(copies.get('/api/news').data.teams[0].id,'new');
 assert.equal((await api('/api/news')).teams[0].id,'new');assert.equal(calls,1);
});
test('una recarga explícita y las actas en directo esperan el resultado nuevo',async t=>{
 const {api}=await client(t,async(_url,options)=>{assert.equal(options.cache,'no-store');return response({score:2})},[['/api/match?team=a&match=b&refresh=1',stale({score:1})]]);
 const cached=[];const result=await api('/api/match?team=a&match=b&refresh=1',{cache:'no-store',onUpdate:value=>cached.push(value)});
 assert.equal(cached[0].score,1);assert.equal(cached[0].fromCache,true);assert.equal(result.score,2);
});
test('una actualización antigua no sobrescribe una recarga más reciente', {timeout:3000},async t=>{
 const old=deferred(),fresh=deferred(),started=deferred(),updated=deferred();let calls=0;
 const {api,copies}=await client(t,()=>{if(++calls===1)return old.promise;started.resolve();return fresh.promise},[['/api/scorers',stale({rows:[{goals:1}]})]]);
 await api('/api/scorers',{onUpdate:updated.resolve});
 const manual=api('/api/scorers',{cache:'reload'});await started.promise;
 fresh.resolve(response({rows:[{goals:3}]}));await manual;
 old.resolve(response({rows:[{goals:2}]}));
 assert.equal((await updated.promise).rows[0].goals,3);assert.equal(copies.get('/api/scorers').data.rows[0].goals,3);
});
test('no guarda ni reutiliza cuentas, permisos o respuestas de escritura',async t=>{
 const {api,copies,reads}=await client(t,async()=>response({source:'server'}),[['/api/auth/me',stale({source:'old-account'})]]);
 assert.equal((await api('/api/auth/me')).source,'server');
 await api('/api/admin/users');await api('/api/push/subscription',{method:'POST',body:'{}'});
 assert.deepEqual(reads,[]);assert(!copies.has('/api/admin/users'));assert(!copies.has('/api/push/subscription'));
});
test('el fallo de actualización conserva los datos guardados y se comunica al consumidor', {timeout:3000},async t=>{
 const failed=deferred();const {api,copies}=await client(t,async()=>{throw Error('Sin red')},[['/api/standings?team=a',stale({rows:[{points:12}]})]]);
 assert.equal((await api('/api/standings?team=a',{onRefreshError:failed.resolve})).rows[0].points,12);
 assert.match((await failed.promise).message,/Sin red/);assert.equal(copies.get('/api/standings?team=a').data.rows[0].points,12);
});
test('si no hay manejador de error, la pantalla recibe la copia marcada como no actualizada', {timeout:3000},async t=>{
 const updated=deferred();const {api}=await client(t,async()=>{throw Error('Sin red')},[['/api/players?team=a',stale({players:[{id:'player'}]})]]);
 await api('/api/players?team=a',{onUpdate:updated.resolve});
 const value=await updated.promise;assert.equal(value.error,true);assert.equal(value.offline,true);assert.equal(value.players[0].id,'player');
});
test('Instagram limita a ocho tanto la copia anterior como lo que se guarda de la red', {timeout:3000},async t=>{
 const updated=deferred();const posts=Array.from({length:20},(_,id)=>({id:String(id)}));
 const {api,copies}=await client(t,async()=>response({posts}),[['/api/instagram',stale({posts})]]);
 assert.equal((await api('/api/instagram',{onUpdate:updated.resolve})).posts.length,8);
 assert.equal((await updated.promise).posts.length,8);assert.equal(copies.get('/api/instagram').data.posts.length,8);
});
test('cancelar una consulta impide devolver la copia como si se hubiera completado',async t=>{
 let calls=0;const {api}=await client(t,async()=>{calls++;return response({})},[['/api/news',stale({teams:[]})]]);
 const controller=new AbortController();controller.abort();
 await assert.rejects(api('/api/news',{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,0);
});
test('los equipos elegidos para avisos no se reemplazan al cambiar los favoritos',()=>{
 const preferences={teamSelection:'custom',teamIds:['a','a']};
 const targets=resolveDeviceTargets(preferences,['b'],['player']);
 assert.deepEqual(targets,{teamIds:['a'],playerIds:['player']});
 assert.equal(matchesNotification({teamIds:['a']},{enabled:true,...targets}),true);
 assert.equal(matchesNotification({teamIds:['b']},{enabled:true,...targets}),false);
 assert.equal(matchesNotification({all:true},{enabled:true,...targets}),true);
 assert.deepEqual(resolveDeviceTargets({teamSelection:'custom',teamIds:[]},['b'],[]).teamIds,[]);
 assert.deepEqual(resolveDeviceTargets({},['b'],[]).teamIds,['b']);
});
test('guarda la selección, reintenta cambios sin red y conserva los equipos al desactivar',async t=>{
 const stored=new Map(),sent=[];let online=true,gate=null;
 global.__notificationTest={
  storage:{getItem:async key=>stored.get(key)||null,setItem:async(key,value)=>stored.set(key,value)},
  getRandomBytesAsync:async()=>new Uint8Array(32).fill(1),
  AppState:{currentState:'active',addEventListener:()=>({remove(){}})},auth:{currentUser:null},
  api:async(path,options)=>{assert.equal(path,'/api/push/subscription');if(!online)throw Error('Sin red');sent.push(JSON.parse(options.body));if(gate){const current=gate;gate=null;current.started.resolve();await current.promise}return {ok:true}},
  registerPush:async()=>({provider:'expo',token:'ExponentPushToken[device-fixture]'}),
  saveCopy:async()=>{},readCopy:async()=>null,resolveDeviceTargets,
 };
 t.after(()=>delete global.__notificationTest);
 global.__notificationTest.verifiedAccount=require('./account-verification.cjs').verifiedAccount;
 let source=fs.readFileSync('./notifications.js','utf8');
 const imports={
  "import {verifiedAccount} from './account-verification.cjs';":"const {verifiedAccount}=globalThis.__notificationTest;",
  "import AsyncStorage from '@react-native-async-storage/async-storage';":"const AsyncStorage=globalThis.__notificationTest.storage;",
  "import {getRandomBytesAsync} from 'expo-crypto';":"const {getRandomBytesAsync}=globalThis.__notificationTest;",
  "import {AppState} from 'react-native';":"const {AppState}=globalThis.__notificationTest;",
  "import {auth} from './firebase';":"const {auth}=globalThis.__notificationTest;",
  "import {api} from './api';":"const {api}=globalThis.__notificationTest;",
  "import {registerPush} from './push';":"const {registerPush}=globalThis.__notificationTest;",
  "import {saveCopy,readCopy} from './offline';":"const {saveCopy,readCopy}=globalThis.__notificationTest;",
  "import {resolveDeviceTargets} from './notification-targets.cjs';":"const {resolveDeviceTargets}=globalThis.__notificationTest;",
 };
 for(const [before,after] of Object.entries(imports)){assert(source.includes(before));source=source.replace(before,after)}
 const service=await import('data:text/javascript,'+encodeURIComponent(source));
 await service.enableNotifications(['a'],[]);
 await service.updateNotificationTargets(['b'],[]);
 assert.deepEqual(sent.at(-1).teamIds,['a']);assert.match(sent[0].installationKey,/^[0-9a-f]{64}$/);
 const delayed=deferred();delayed.started=deferred();gate=delayed;
 const older=service.updateNotificationTargets(['b'],[]);await delayed.started.promise;
 const newer=service.saveNotificationTeams(['b'],[]);
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual((await service.notificationPreferences()).teamIds,['b']);
 delayed.resolve();await Promise.all([older,newer]);assert.deepEqual(sent.at(-1).teamIds,['b']);
 online=false;const pending=await service.saveNotificationTeams(['b'],[]);
 assert.equal(pending.pendingSync,true);assert.deepEqual((await service.notificationPreferences()).teamIds,['b']);
 online=true;await service.updateNotificationTargets(['a'],[]);
 assert.deepEqual(sent.at(-1).teamIds,['b']);assert.equal((await service.notificationPreferences()).pendingSync,false);
 online=false;await service.disableNotifications();assert.equal((await service.notificationPreferences()).enabled,false);
 online=true;await service.updateNotificationTargets(['a'],[]);
 assert.equal(sent.at(-1).enabled,false);assert.deepEqual(sent.at(-1).teamIds,['b']);
 global.__notificationTest.auth.currentUser={emailVerified:false,providerData:[{providerId:'google.com'}],getIdToken:()=>assert.fail('No debe pedir token ni enviar con cuenta sin verificar')};
 await assert.rejects(()=>service.sendClubNotification({title:'Fixture',body:'No enviar'}),/Verifica tu cuenta/);
});
test('un acta histórica cerrada se consulta desde el dispositivo sin red; actualizar sigue forzando la red',async t=>{
 let calls=0;const path='/api/match?team=a&match=old';const {api}=await client(t,async()=>{calls++;return response({closed:true,goals:[{name:'Nuevo'}]})},[[path,stale({closed:true,goals:[{name:'Guardado'}]})]]);
 assert.equal((await api(path,{cache:'archive'})).goals[0].name,'Guardado');assert.equal(calls,0);
 assert.equal((await api(path,{cache:'reload'})).goals[0].name,'Nuevo');assert.equal(calls,1);
});

test('actualizar un acta también corrige el archivo que se abrirá sin conexión',async t=>{
 const path='/api/match?team=a&match=old';const {api}=await client(t,async()=>response({closed:true,goals:[{name:'Corregido'}]}),[[path,stale({closed:true,goals:[]})]]);await api(path+'&refresh=1',{cache:'no-store'});assert.equal((await api(path,{cache:'archive'})).goals[0].name,'Corregido');
});

test('estadísticas del portero recorren actas paginadas y se conservan sin conexión sin alterar tarjetas',async t=>{
 const {api,copies}=await client(t,async url=>url.includes('/api/players')?response({players:[{id:'k',position:'Portero',goals:0,yellow:2,red:1}]}):response({records:[{id:'m',keepers:[{teamId:'a',playerId:'k',played:true,goalsConceded:2,cleanSheets:0}]}],nextOffset:null}));
 const value=await api('/api/players?team=a');assert.equal(value.players[0].goalsConceded,2);assert.equal(value.players[0].cleanSheets,0);assert.equal(value.players[0].yellow,2);assert(copies.has('goalkeeperTotals.v1.a'));
 global.fetch=async()=>{throw Error('sin conexión')};const saved=await api('/api/players?team=a',{cache:'reload'});assert.equal(saved.players[0].goalsConceded,2);assert.equal(saved.players[0].red,1);
});
test('recuento parcial de porteros conserva cifras confirmadas y su aviso sin conexión',async t=>{const {api,copies}=await client(t,async url=>url.includes('/api/players')?response({players:[{id:'k',position:'Portero'}]}):response({records:[{id:'one',keepers:[{teamId:'a',playerId:'k',played:true,goalsConceded:1,cleanSheets:0}]},{id:'pending',error:true}],nextOffset:null}));const first=await api('/api/players?team=a');assert.equal(first.players[0].goalsConceded,1);assert(first.players[0].goalkeeperPartial);assert.equal(copies.get('goalkeeperTotals.v1.a').data.missing,1);global.fetch=async()=>{throw Error('sin conexión')};const offline=await api('/api/players?team=a',{cache:'reload'});assert.equal(offline.players[0].goalsConceded,1);assert(offline.players[0].goalkeeperPartial)});
test('muestra los acumulados locales del portero sin esperar la actualización de actas',async t=>{const network=deferred(),update=deferred(),old={players:[{playerId:'k',goalsConceded:2,cleanSheets:1,isGoalkeeper:true}],checkedAt:'old'};const {api}=await client(t,async url=>url.includes('/api/goalkeepers')?network.promise:response({players:[{id:'k',position:'Portero'}]}),[['goalkeeperTotals.v1.a',{data:old,savedAt:new Date(Date.now()-360000).toISOString()}]]);const initial=await api('/api/players?team=a',{onUpdate:update.resolve});assert.equal(initial.players[0].goalsConceded,2);network.resolve(response({records:[{id:'m',keepers:[{teamId:'a',playerId:'k',played:true,goalsConceded:3,cleanSheets:0}]}],nextOffset:null}));assert.equal((await update.promise).players[0].goalsConceded,3)});

test('registra fallos de actas y formatos incorrectos sin guardar el contenido de la respuesta',async t=>{const {api,events}=await client(t,async()=>({ok:true,json:async()=>{throw SyntaxError('private response')}}));await assert.rejects(()=>api('/api/match?id=123',{cache:'reload'}),/datos válidos/);assert.equal(events[0].code,'FORMAT');assert.equal(events[0].category,'actas');assert.equal(JSON.stringify(events).includes('private response'),false)});
