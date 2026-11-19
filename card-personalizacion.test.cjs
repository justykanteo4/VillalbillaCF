const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cardSvg}=require('./card-export-svg.cjs');
const {backgroundRemovalHtml}=require('./photo-background-removal.cjs');

test('carta: conserva campos, estadísticas y diseño sin inyectar HTML',()=>{
 const svg=cardSvg({name:'Mario <script>',position:'DC',number:'9',average:82,category:'Alevín A',ratings:{velocidad:83,regate:84,tiro:85,pase:78,defensa:60,fisico:77},played:10,goals:7,assists:3});
 assert.match(svg,/MARIO &lt;SCRIPT&gt;/);
 assert.doesNotMatch(svg,/<script>/);
 assert.match(svg,/VILLALBILLA C\.F\./);
 assert.match(svg,/TEMPORADA 2026\/27/);
 assert.match(svg,/ASISTENCIAS/);
 assert.match(svg,/VELOCIDAD/);
 assert.match(svg,/ALEVÍN A/);
});
test('carta: puede mostrar foto externa sin icono de sustitución',()=>{
 const svg=cardSvg({photo:'',showPhotoPlaceholder:false});
 assert.doesNotMatch(svg,/font-size="92" fill="#b2dff6"/);
});
test('foto: genera segmentación local gratuita, máscara alfa y PNG',()=>{
 const html=backgroundRemovalHtml('aGVsbG8=');
 assert.match(html,/SelfieSegmentation/);
 assert.match(html,/segmentationMask/);
 assert.match(html,/source-in/);
 assert.match(html,/toDataURL\('image\/png'\)/);
 assert.match(html,/ReactNativeWebView\.postMessage/);
 assert.throws(()=>backgroundRemovalHtml('</script>'),/Fotografía inválida/);
});
