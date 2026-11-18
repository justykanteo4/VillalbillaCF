const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Apariencia personal guarda vista de jugadores por dispositivo',()=>{
 const pref=fs.readFileSync('PlayerViewPreference.js','utf8');
 assert.match(pref,/AsyncStorage\.setItem\(PLAYER_VIEW_KEY,value\)/);
 assert.match(pref,/readPlayerView/);
 assert.match(pref,/Tarjetas con fotografías/);
 assert.match(pref,/Lista compacta/);
});
test('Ajustes personales muestran la vista y Jugadores aplica las dos presentaciones',()=>{
 const settings=fs.readFileSync('SettingsHub.js','utf8');
 const players=fs.readFileSync('Players.js','utf8');
 assert.match(settings,/\['player-view','Vista de jugadores: tarjetas o lista'\]/);
 assert.match(settings,/page==='player-view'\?<PlayerViewPreference\/>/);
 assert.match(players,/playerView==='list'\?s\.listCard:s\.card/);
 assert.match(players,/AppState\.addEventListener\('change'/);
});
