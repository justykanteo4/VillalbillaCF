const {test}=require('node:test'),assert=require('node:assert/strict'),{stats}=require('./server/players.cjs');
const html=player=>'<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{player}}})+'</script>';
const row={id:'8078212',name:'Jugador',teamId:'8941348',position:null,number:null,goals:null,yellow:null,played:null,calledUp:null,available:false};
test('una ficha federativa de otro equipo no atribuye estadísticas y conserva al jugador del listado oficial',()=>{
 const value=stats(html({codigo_jugador:'8078212',codigo_temporada:'22',codigo_equipo:'846518',competiciones_participa:[{codequipo:'846518',ver_estadisticas:'1'}],posicion_jugador:'',partidos:[{nombre:'Total Goles',valor:'4'}]}),row);
 assert.equal(value.id,'8078212');assert.equal(value.teamId,'8941348');assert.equal(value.federationTeamId,'846518');
 assert.equal(value.error,false);assert.equal(value.statsUnavailable,true);assert.equal(value.federationTeamMismatch,true);
 assert.equal(value.available,false);assert.equal(value.goals,null);assert.equal(value.position,null);
});
test('conserva validación estricta para un jugador o temporada incorrectos',()=>{
 assert.throws(()=>stats(html({codigo_jugador:'OTRO',codigo_temporada:'22'}),row),/otra temporada o jugador/);
 assert.throws(()=>stats(html({codigo_jugador:'8078212',codigo_temporada:'21'}),row),/otra temporada o jugador/);
});
test('si la competición sí corresponde al equipo, se conservan las estadísticas disponibles',()=>{
 const value=stats(html({codigo_jugador:'8078212',codigo_temporada:'22',codigo_equipo:'846518',competiciones_participa:[{codequipo:'8941348',ver_estadisticas:'1',vis_goles:'1',vis_minutos:'1'}],posicion_jugador:'Delantero',no_vis_estadistica:'0',partidos:[{nombre:'Jugados',valor:'3'},{nombre:'Total Goles',valor:'2'}]}),row);
 assert.equal(value.error,false);assert.equal(value.available,true);assert.equal(value.goals,2);assert.equal(value.position,'Delantero');
});
