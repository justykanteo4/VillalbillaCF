const W=1199,H=1312;
function drawCard(D){
 const ctx=document.getElementById('card').getContext('2d');
 const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Imagen no disponible'));im.src=src});
 const grad=(x,y,w,h,a,b)=>{const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g};
 const rect=(x,y,w,h,fill,stroke)=>{ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h)}};
 const text=(v,x,y,size,color='#fff',align='center')=>{ctx.font='italic 900 '+size+'px Arial';ctx.textAlign=align;ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='#09112e';ctx.strokeText(String(v),x,y);ctx.fillStyle=color;ctx.fillText(String(v),x,y)};
 const value=n=>n==null||!Number.isFinite(Number(n))?'—':String(n);
 const score=n=>Math.max(1,Math.min(99,Math.round(Number(n)||1)));
 const imageFit=(image,x,y,w,h)=>{const s=Math.min(w/image.naturalWidth,h/image.naturalHeight),dw=image.naturalWidth*s,dh=image.naturalHeight*s;ctx.drawImage(image,x+(w-dw)/2,y+(h-dh)/2,dw,dh)};
 const notify=v=>window.ReactNativeWebView?.postMessage(JSON.stringify(v));
 (async()=>{
  try{
   const base=await load('data:image/png;base64,'+D.template);
   ctx.drawImage(base,0,0,1199,1312);
   // Cubrir los datos fijos de Mario sin eliminar el borde ornamental original.
   rect(366,35,503,568,grad(366,35,869,605,'#100d32','#062458'));
   if(D.photo){const person=await load('data:image/'+D.photoMime+';base64,'+D.photo);imageFit(person,377,46,486,562)}
   else{text('TU FOTO',615,366,59,'#c0e9ff')}
   rect(180,125,218,242,grad(180,125,400,365,'#300820','#5a0b25'),'#ffc05b');
   text(score(D.avg),287,270,111,'#ffe25c');text(D.role,289,344,65);
   rect(754,91,231,300,grad(754,90,985,390,'#081a40','#0b2752'));
   if(D.crest){const crest=await load('data:image/png;base64,'+D.crest);imageFit(crest,799,95,155,206)}
   text('VILLALBILLA',868,347,27);text('C.F.',868,379,29);
   rect(305,608,478,105,grad(305,608,783,713,'#9d082f','#0b204e'),'#ffc06b');
   text(D.name,545,685,D.name.length>15?37:61);
   rect(859,591,148,130,grad(859,591,1007,721,'#c10d2c','#3f0825'),'#ffc35e');text(D.number,933,695,91);
   const s=[['VELOCIDAD','velocidad',192,733],['REGATE','regate',192,800],['TIRO','tiro',192,866],['PASE','pase',598,733],['DEFENSA','defensa',598,800],['FÍSICO','fisico',598,866]];
   for(const [label,key,x,y] of s){rect(x,y,386,63,grad(x,y,x+386,y+63,'#07183f','#14508b'),'#31b5fb');text(label,x+17,y+42,25,'#fff','left');text(score(D.ratings?.[key]),x+358,y+48,48,'#ffe64e','right')}
   for(const [label,v,x] of [['PARTIDOS',D.played,153],['GOLES',D.goals,444],['ASISTENCIAS',D.assists,733]]){rect(x,951,284,112,grad(x,951,x+284,1063,'#380822','#5c0c34'),'#ff5171');text(label,x+142,990,24);text(value(v),x+142,1047,53,'#ffe65f')}
   rect(387,1082,418,120,grad(387,1082,805,1202,'#091b51','#144e94'),'#ffd068');
   text(D.category,596,1137,D.category.length>19?24:34);text('TEMPORADA 2026/27',596,1180,26);
   if(D.exportPng)notify({png:document.getElementById('card').toDataURL('image/png').split(',')[1]});
  }catch(error){notify({error:String(error)})}
 })();
}
function renderCardDocument(data,exportPng=false){
 if(!data.template||!/^[A-Za-z0-9+/=]+$/.test(data.template))throw Error('Plantilla PNG no disponible');
 const d={...data,name:String(data.name||'JUGADOR').toUpperCase().slice(0,22),role:String(data.role||'JUG').slice(0,3).toUpperCase(),number:String(data.number||'10').slice(0,2),category:String(data.category||'VILLALBILLA C.F.').toUpperCase().slice(0,36),exportPng};
 const json=JSON.stringify(d).replace(/</g,'\\u003c');
 return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head><body style="margin:0;background:transparent;overflow:hidden"><canvas id="card" width="1199" height="1312" style="width:100%;height:100%;display:block"></canvas><script>('+drawCard.toString()+')('+json+')</script></body></html>';
}
module.exports={renderCardDocument,W,H};