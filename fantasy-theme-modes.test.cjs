const {test}=require('node:test'),assert=require('node:assert/strict');
const {MODES,normalizeMode,resolvedMode,palette,DARK,LIGHT}=require('./fantasy-theme-modes.cjs');
test('elige modo auto por defecto y no admite valores arbitrarios',()=>{assert.deepEqual(MODES,['light','dark','auto']);assert.equal(normalizeMode('otro'),'auto')});
test('el automático respeta sistema y también permite modos manuales',()=>{
 assert.equal(resolvedMode('auto','light'),'light');
 assert.equal(resolvedMode('auto','dark'),'dark');
 assert.equal(resolvedMode('auto',null),'dark');
 assert.equal(resolvedMode('dark','light'),'dark');
 assert.equal(resolvedMode('light','dark'),'light');
});
test('todas las paletas contienen las mismas claves con valores hexadecimales',()=>{
 assert.deepEqual(Object.keys(LIGHT),Object.keys(DARK));
 for(const p of [LIGHT,DARK])for(const color of Object.values(p))assert.match(color,/^#[0-9A-Fa-f]{6}$/);
 assert.notEqual(palette('light','dark').background,palette('dark','light').background);
});

test('texto principal, secundario y acentos mantienen contraste legible en ambas paletas',()=>{
 const luminosity=hex=>{const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722};
 const contrast=(a,b)=>{const x=luminosity(a),y=luminosity(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
 for(const palette of [LIGHT,DARK]){
  assert(contrast(palette.text,palette.panel)>=4.5,'contraste del texto de panel');
  assert(contrast(palette.muted,palette.panel)>=4.5,'contraste del texto secundario');
  assert(contrast(palette.buttonText,palette.button)>=4.5,'contraste de botones');
 }
});
