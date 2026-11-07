const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {normalizeDestination,destinationRoute,destinationUrl,destinationFromUrl}=require('./notification-destination.cjs');
const {notificationIntent,notificationDestination}=require('./notification-open.cjs');
test('club notifications route to exact public content without opening notification preferences',()=>{
 for(const account of [null,{status:'admin'},{status:'approved',claim:{role:'player'}}]){
  const intent=notificationIntent({destination:{type:'section',section:'goalkeepers'}});assert.equal(notificationDestination(intent,account),'Rankings');assert.deepEqual(destinationRoute(intent.destination),{area:'Rankings',rankingView:'keepers'});
  assert.equal(notificationDestination(notificationIntent({notificationId:'old'}),account),'Noticias');
 }
 assert.deepEqual(destinationRoute({type:'match',teamId:'680163',matchId:'5587337'}),{area:'Resultados',match:{teamId:'680163',matchId:'5587337'}});
 assert.deepEqual(destinationRoute({type:'section',section:'goalkeeper-votes'}),{area:'Votaciones',voteCategory:'goalkeeper'});
});
test('only known public sections and club teams can be destinations; external or private routes are rejected',()=>{
 for(const d of [{type:'section',section:'Ajustes'},{type:'section',section:'Administración'},{type:'url',url:'https://evil.test'},{type:'match',teamId:'unknown',matchId:'1'},{type:'match',teamId:'680163',matchId:'../private'},[],null])assert.equal(normalizeDestination(d),null);
 const d={type:'match',teamId:'680163',matchId:'5587337'};assert.deepEqual(destinationFromUrl('https://club.test'+destinationUrl(d,'notice')),d);assert.equal(destinationFromUrl('https://club.test/?aviso=invalid'),null);
 assert.deepEqual(notificationIntent({accessRequest:true,requestId:'a'.repeat(64),destination:d}),{type:'request',requestId:'a'.repeat(64)});
});
test('Web Push preserves the content link and focuses the existing window; foreign URLs fall back to News',async()=>{
 const handlers={},shown=[],opened=[],navigated=[],self={location:{origin:'https://club.test'},addEventListener:(event,fn)=>handlers[event]=fn,registration:{showNotification:async(title,options)=>shown.push(options)},clients:{matchAll:async()=>[{url:'https://club.test/',navigate:async url=>navigated.push(url),focus:async()=>{}}],openWindow:async url=>opened.push(url)}};
 vm.runInNewContext(fs.readFileSync('./public/firebase-messaging-sw.js','utf8'),{self,URL,JSON,encodeURIComponent});
 const url=destinationUrl({type:'section',section:'goalkeepers'},'notice');let job;handlers.push({data:{json:()=>({title:'Porteros',url})},waitUntil:p=>job=p});await job;
 handlers.notificationclick({notification:{data:shown[0].data,close(){}},waitUntil:p=>job=p});await job;assert.equal(navigated[0],'https://club.test'+url);assert.deepEqual(opened,[]);
 self.clients.matchAll=async()=>[];handlers.notificationclick({notification:{data:{url:'https://evil.test/'},close(){}},waitUntil:p=>job=p});await job;assert.equal(new URL(opened[0]).origin,'https://club.test');assert.deepEqual(destinationFromUrl(opened[0]),{type:'section',section:'news'});
});
