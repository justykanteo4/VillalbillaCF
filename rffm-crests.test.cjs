const {test}=require('node:test');
const assert=require('node:assert/strict');
const {crestFromFixture,safeCrestUrl}=require('./rffm-crests.cjs');
const {parseCalendar,SOURCE}=require('./calendar-source.cjs');
const {parseTeam}=require('./server/news.cjs');
test('escudos oficiales de ambos equipos se extraen del calendario ya descargado',()=>{
 const record={codigo_equipo_local:'680163',codigo_equipo_visitante:'846913',
  codacta:'12345',equipo_local:'VILLALBILLA C.F.',equipo_visitante:'RIVAL',
  escudo_equipo_local:'/images/escudos/680163.png',
  escudo_equipo_visitante:'https://rffm-cms.s3.eu-west-1.amazonaws.com/rival.webp',
  fecha:'19-11-2026',hora:'18:00',goles_casa:'',goles_visitante:''};
 const p={query:{grupo:'26737710',temporada:'22'},calendar:{rounds:[{codjornada:'1',equipos:[record]}]}};
 const html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:p}})+'</script>';
 const calendar=parseCalendar(html);
 assert.equal(calendar.fixtures[0].homeCrest,'https://www.rffm.es/images/escudos/680163.png');
 assert.equal(calendar.fixtures[0].awayCrest,record.escudo_equipo_visitante);
 const team=parseTeam(html,{id:'680163',group:'26737710',competition:'26737706'});
 assert.equal(team.fixtures[0].homeCrest,calendar.fixtures[0].homeCrest);
 assert.equal(team.fixtures[0].awayCrest,calendar.fixtures[0].awayCrest);
});
test('solo imágenes federativas HTTPS: no se abre ni carga una URL externa inyectada',()=>{
 assert.equal(safeCrestUrl('http://www.rffm.es/images/escudos/1.png'),null);
 assert.equal(safeCrestUrl('https://evil.example/escudos/1.png'),null);
 assert.equal(safeCrestUrl('https://www.rffm.es.evil.example/images/1.png'),null);
 assert.equal(safeCrestUrl('data:image/png;base64,AA'),null);
 assert.equal(safeCrestUrl('javascript:alert(1)'),null);
 assert.equal(safeCrestUrl('https://www.rffm.es/imagen.png'),'https://www.rffm.es/imagen.png');
 assert.equal(safeCrestUrl(null),null);
});
test('no inventa escudos cuando la federación no facilita la imagen',()=>{
 assert.equal(crestFromFixture({equipo_local:'LOCAL',equipo_visitante:'VISITANTE'},'home'),null);
 assert.equal(crestFromFixture({equipo_local:'LOCAL',equipo_visitante:'VISITANTE'},'away'),null);
 assert.equal(crestFromFixture({escudo_local:'https://evil.example/x.png'},'home'),null);
});

test('acepta rutas reales RFFM /pnfg/pimg/Clubes, incluidos nombres con espacios',()=>{
 const m={escudo_equipo_local:'/pnfg/pimg/Clubes/00100_0011715402_logo_M__xico_FC_rN.png',escudo_equipo_visitante:'/pnfg/pimg/Clubes/00100_0000042740_ESCUDO BARAJAS.jpg'};
 assert.equal(crestFromFixture(m,'home'),'https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011715402_logo_M__xico_FC_rN.png');
 assert.equal(crestFromFixture(m,'away'),'https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0000042740_ESCUDO%20BARAJAS.jpg');
});

test('acepta el escudo .jfif publicado por la RFFM en el calendario de Daganzo',()=>{
 assert.equal(safeCrestUrl('https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011030121_daganzo.jfif'),'https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011030121_daganzo.jfif');
});
