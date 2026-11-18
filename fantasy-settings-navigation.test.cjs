const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Ajustes Fantasy separan Club y usuario y protegen herramientas administrativas',()=>{
 const src=fs.readFileSync('FantasySettings.js','utf8');
 assert.match(src,/isAdmin&&matches\("Administración y seguridad/);
 assert.match(src,/isAdmin&&matches\("Ligas/);
 assert.match(src,/isAdmin&&matches\("Puntuaciones/);
 assert.match(src,/isAdmin&&matches\("Mercado/);
 assert.match(src,/Club · Ligas y competición/);
 assert.match(src,/Club · Puntuaciones y premios/);
 assert.match(src,/Club · Mercado y economía/);
 assert.match(src,/Club · Administración y seguridad/);
 assert(!/title="Premios y entrenadores"/.test(src),'No mostrar herramientas de premios a usuarios sin autorización');
});
test('Los ajustes generales agrupan las opciones personales y las del Club',()=>{
 const src=fs.readFileSync('SettingsHub.js','utf8');
 assert.match(src,/Mis ajustes · Mi cuenta/);
 assert.match(src,/Mis ajustes · Avisos y ayuda/);
 assert.match(src,/Club · Administración y seguridad/);
 assert.match(src,/account\?\.status==='admin'/);
});

test('La publicación preparada incluye web, Android e iOS',()=>{
 const src=fs.readFileSync('.github/workflows/fantasy-publish-main.yml','utf8');
 assert.match(src,/expo export --platform all/);
 assert.match(src,/expo export --platform web/);
 assert.match(src,/Publish Android 0\.1\.13 runtime OTA/);
 assert.match(src,/Publish iOS 0\.1\.13 runtime OTA/);
 assert.match(src,/update --channel production --platform ios/);
});
