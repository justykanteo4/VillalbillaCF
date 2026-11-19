// Public-page diagnostic: runs only during CI; does not collect personal data.
(async()=>{
 const u='https://www.rffm.es/competicion/calendario?competicion=26737706&grupo=26737710&jornada=1&temporada=22&tipojuego=1';
 const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (compatible; VillalbillaCF/1.0)'},signal:AbortSignal.timeout(25000)});
 console.log('STATUS',r.status,'TYPE',r.headers.get('content-type'));if(!r.ok)process.exit(1);
 const html=await r.text(),next=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 console.log('HTML_BYTES',html.length,'NEXT_DATA',!!next);
 if(next){const p=JSON.parse(next[1]).props?.pageProps||{},m=p.calendar?.rounds?.flatMap(x=>x.equipos||[]).find(x=>x.codigo_equipo_local&&x.codigo_equipo_visitante);
  console.log('MATCH_KEYS',m?Object.keys(m).join(', '):'no-match');console.log('MATCH_EXAMPLE',m?JSON.stringify(m).slice(0,1800):'none');if(m?.escudo_equipo_local){
 const u=new URL(m.escudo_equipo_local,'https://www.rffm.es');
 try{
  const probe=await fetch(u,{method:'HEAD',signal:AbortSignal.timeout(10000)});
  console.log('REAL_CREST_HTTP',probe.status,'TYPE',probe.headers.get('content-type'),'URL',u.href);
 }catch(e){console.log('REAL_CREST_HTTP_ERROR',e.message)}
}
  console.log('PAGE_KEYS',Object.keys(p).join(', '));
 }
 const matches=[...html.matchAll(/<img\b[^>]{0,1800}>/gi)];
 console.log('IMAGE_COUNT',matches.length);
 const images=matches.map(x=>x[0]).filter(x=>/escudo|logo|\/_next\/image|badge/i.test(x)).slice(0,8);
 images.forEach((img,i)=>console.log('IMAGE_'+i,img.slice(0,1800)));
 const imagesRaw=[...html.matchAll(/.{0,170}(?:escudo equipo local|escudo-equipo-local|escudo_local|logo_equipo|imagen_equipo).{0,210}/gi)].slice(0,7);
 imagesRaw.forEach((x,i)=>console.log('HTML_HINT_'+i,x[0].slice(0,380)));
})().catch(e=>{console.error('RFFM_DIAGNOSTIC',e.message);process.exitCode=1});
