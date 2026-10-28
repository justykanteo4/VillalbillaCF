globalThis.__goalkeeperTest=require('./goalkeeper-stats.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergeChanges}=require('./workspace-sync.cjs');
const {matchesNotification}=require('./notification-targets.cjs');
const {explicitSuspension}=require('./sanction-duration.cjs');
const {currentSuspensions}=require('./server/sanctions.cjs');
test('dos entrenadores conservan asistencia y material editados a la vez',()=>{
 const base={attendance:{'2026-10-25':{a:'Sí'}},materials:[{id:'ball',returned:false}]};
 const local=structuredClone(base),remote=structuredClone(base);local.attendance['2026-10-25'].b='No';remote.materials[0].returned=true;
 const merged=mergeChanges(base,local,remote);assert.equal(merged.materials[0].returned,true);assert.equal(merged.attendance['2026-10-25'].b,'No');assert.equal(merged.attendance['2026-10-25'].a,'Sí');
});
test('altas simultáneas y cambios en distintas propiedades del mismo material',()=>{
 const base={materials:[{id:'a',holder:'Ana',returned:false}]},local={materials:[{id:'a',holder:'Luis',returned:false},{id:'b',qty:2}]},remote={materials:[{id:'a',holder:'Ana',returned:true},{id:'c',qty:3}]};
 const merged=mergeChanges(base,local,remote);assert.equal(merged.materials.length,3);assert.deepEqual(merged.materials[0],{id:'a',holder:'Luis',returned:true});
});
test('borrados remotos no reaparecen por editar otra sección',()=>{
 assert.deepEqual(mergeChanges({materials:[{id:'a'}],team:'A'},{materials:[{id:'a'}],team:'B'},{materials:[],team:'A'}),{materials:[],team:'B'});
});
test('migración de una copia antigua conserva altas remotas',()=>{
 assert.equal(mergeChanges({},{materials:[{id:'a'}]},{materials:[{id:'b'}]}).materials.length,2);
});
test('misma celda: prevalece la última edición local; otras celdas se conservan',()=>{
 assert.deepEqual(mergeChanges({a:'Sí',b:'Sí'},{a:'No',b:'Sí'},{a:'Justificada',b:'No'}),{a:'No',b:'No'});
});
test('avisos por equipos, por jugadores, generales y sin consentimiento',()=>{
 const s={enabled:true,teamIds:['t1'],playerIds:['p1']};
 assert(matchesNotification({teamIds:['t1']},s));assert(matchesNotification({playerIds:['p1']},s));assert(matchesNotification({all:true},s));
 assert(!matchesNotification({teamIds:['t2']},s));assert(!matchesNotification({all:true},{...s,enabled:false}));
});
test('solo se acepta una duración explícita, sin convertir rojas en un partido',()=>{
 for(const value of ['Roja','5 amarillas','Suspensión','0 partidos',null,3])assert.equal(explicitSuspension(value),null);
 assert.equal(explicitSuspension('Suspensión de 3 partidos').count,3);assert.equal(explicitSuspension('14 días').unit,'days');
});
const fixture=(id)=>({id:String(id),round:id,date:'2026-10-25',homeId:'t',awayId:'r',home:'Club',away:'Rival',homeScore:0,awayScore:0});
const act=cards=>({cardsAvailable:true,cards});
const red={playerId:'p',name:'Jugador',team:'Club',color:'red'};
test('expulsión y cinco amarillas sin duración no generan sanción',()=>{
 const result=currentSuspensions([fixture(1)],new Map([['1',act([red,...Array.from({length:5},()=>({...red,color:'yellow'}))])]]),'t');
 assert.deepEqual(result.sanctions,[]);
});
test('duración de tres partidos no desaparece tras uno',()=>{
 const result=currentSuspensions([fixture(1),fixture(2)],new Map([['1',act([{...red,suspension:explicitSuspension('3 partidos')}])],['2',act([])]]),'t');
 assert.equal(result.sanctions[0].pendingMatches,2);
});
test('Instagram limita a ocho y conserva enlace y fotos del álbum',async()=>{
 const original=global.fetch;let mediaUrl;
 global.fetch=async url=>{if(String(url).includes('/me?'))return {ok:true,json:async()=>({username:'villalbillacf'})};mediaUrl=new URL(url);return {ok:true,json:async()=>({data:Array.from({length:12},(_,i)=>({id:String(i),permalink:'https://www.instagram.com/p/'+i,children:{data:[{media_url:'https://example.org/1.jpg'},{media_url:'https://example.org/2.jpg'}]}}))})}};
 try{const result=await require('./server/news.cjs').instagram('test-token',null);assert.equal(mediaUrl.searchParams.get('limit'),'8');assert.equal(result.posts.length,8);assert.equal(result.posts[0].images.length,2);assert.equal(result.posts[0].permalink,'https://www.instagram.com/p/0')}finally{global.fetch=original}
});
test('endpoint Node de goleadores de liga llama al export correcto',async()=>{
 const scorers=require('./server/scorers.cjs'),original=scorers.leagueScorers;
 scorers.leagueScorers=async id=>({teamId:id,players:[]});
 const {server}=require('./server/index.cjs');
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/league-scorers?team=680163');
  assert.equal(response.status,200);assert.equal((await response.json()).teamId,'680163');
 }finally{scorers.leagueScorers=original;server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
test('consultas públicas se recuperan de la copia local ante fallo de red',async()=>{
 const fs=require('node:fs'),original=global.fetch,copies=new Map();
 global.__testOffline={readCopy:async key=>copies.get(key),saveCopy:async(key,data)=>copies.set(key,{data,savedAt:'2026-10-25T10:00:00Z'})};
 let source=fs.readFileSync('./api.js','utf8').replace("import {recordDiagnostic} from './diagnostics';","const recordDiagnostic=()=>{};").replace("import {sumGoalkeepers} from './goalkeeper-stats.cjs';","const {sumGoalkeepers}=globalThis.__goalkeeperTest;").replace("import {readCopy,saveCopy} from './offline';","const {readCopy,saveCopy}=globalThis.__testOffline;").replace("import {Platform} from 'react-native';","const Platform={OS:'web'};");
 try{
  const {api}=await import('data:text/javascript,'+encodeURIComponent(source));
  global.fetch=async()=>({ok:true,json:async()=>({rows:[{name:'Club',points:3}]})});
  await api('/api/standings?team=1');
  global.fetch=async()=>{throw Error('Sin red')};
  const value=await api('/api/standings?team=1',{cache:'reload'});assert.equal(value.offline,true);assert.equal(value.rows[0].points,3);
  await assert.rejects(api('/api/auth/me'));assert(!copies.has('/api/auth/me'));
  global.fetch=async()=>({ok:false,status:403,json:async()=>({error:'Sin permiso'})});
  await assert.rejects(api('/api/standings?team=1',{cache:'reload'}),/Sin permiso/);
 }finally{global.fetch=original;delete global.__testOffline}
});
test('acumulación: avisa desde cuatro amarillas solo con todas las actas disponibles, sin inventar sanciones',()=>{
 const fixtures=Array.from({length:4},(_,i)=>({id:String(i),round:i+1,date:'2026-09-01',homeId:'a',awayId:'b',home:'Club',away:'Rival',homeScore:1,awayScore:0}));
 const reports=new Map(fixtures.map(m=>[m.id,{cardsAvailable:true,cards:[{name:'Jugador',playerId:'p',team:'Club',color:'yellow',type:'Amarilla'}]}]));
 const complete=currentSuspensions(fixtures,reports,'a');assert.equal(complete.yellowWarnings[0].yellowCards,4);assert.equal(complete.sanctions.length,0);reports.delete('0');assert.equal(currentSuspensions(fixtures,reports,'a').yellowWarnings.length,0);
});
test('alias y posición del mismo jugador editados por dos entrenadores se combinan aunque la ficha compartida no existiera',()=>{
 const {setPlayerDetail}=require('./player-details.cjs');const base={playerDetails:{},attendance:{},materials:[]};const coachA=setPlayerDetail(base,'p','alias','Pepe'),coachB=setPlayerDetail(base,'p','position','Defensa');const shared=mergeChanges(base,coachA,coachB);assert.deepEqual(shared.playerDetails.p,{alias:'Pepe',position:'Defensa'});assert.deepEqual(mergeChanges(coachA,setPlayerDetail(coachA,'p','alias',''),shared).playerDetails.p,{alias:'',position:'Defensa'});
});
test('migrar alias y posiciones antiguos no pisa datos compartidos, alias borrados ni jugadores de otros equipos',()=>{
 const {mergeLegacyDetails}=require('./player-details.cjs');const existing={p:{alias:'',position:'Portero'}};assert.equal(mergeLegacyDetails(existing,[{id:'p'}],{p:'Viejo',q:'Otro'},{p:'Defensa'}),existing);assert.deepEqual(mergeLegacyDetails({},[{id:'local',federationId:'p'}],{p:'Pepe',q:'Otro'},{p:'Defensa'}),{p:{alias:'Pepe',position:'Defensa'}});
});
