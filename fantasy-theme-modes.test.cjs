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
