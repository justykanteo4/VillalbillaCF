const SHELL_CACHE='villalbilla-shell-v1';
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(SHELL_CACHE),response=await fetch('/');
 if(!response.ok)throw Error('No se pudo guardar la aplicación');
 const html=await response.clone().text();await cache.put('/',response);
 const assets=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css|ico)(?:\?[^"']*)?)["']/g)].map(match=>new URL(match[1],self.location.origin).href).filter(url=>url.startsWith(self.location.origin+'/'));
 await cache.addAll(assets);await self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/__/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.put('/',copy)))}return response}).catch(()=>caches.match('/')));return;
 }
 if(!url.pathname.startsWith('/assets/')&&!url.pathname.startsWith('/_expo/')&&!url.pathname.endsWith('.ico'))return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.put(event.request,copy)))}return response})));
});
self.addEventListener('push',event=>{
 let message={};try{message=event.data?.json()||{}}catch{message={body:event.data?.text()||''}}
 event.waitUntil(self.registration.showNotification(message.title||'Villalbilla C.F.',{body:message.body||'Nuevo aviso del club',tag:message.id,icon:'/app-icon.png',data:{url:self.location.origin+'/?avisos=1'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{const url=self.location.origin+'/?avisos=1';const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate(url);return client.focus()}}return self.clients.openWindow(url)})());
});
