const {test}=require('node:test'),assert=require('node:assert/strict'),{roster,stats,loadPlayerDetails}=require('./server/players.cjs');
const html=pageProps=>'<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps}})+'</script>';
const player={cod_jugador:'8078212',nombre:'Jugador Juvenil'};
test('jugador juvenil por equipo, aunque por edad sea cadete, no aparece en la plantilla del Cadete',()=>{
 const cadete={id:'8941348'},juvenil={id:'846518'};
 const page=team=>html({team:{codigo_equipo:team.id,codigo_club:'4144',nombre_equipo:'VILLALBILLA',categoria:'SEGUNDA CADETE',jugadores_equipo:[player,{cod_jugador:'12345',nombre:'Otro'}]}});
 assert.deepEqual(roster(page(cadete),cadete).map(p=>p.id),['12345']);
 assert.deepEqual(roster(page(juvenil),juvenil).map(p=>p.id),['8078212','12345']);
});
test('la ficha de otro equipo no se mezcla con las estadísticas del Cadete',()=>{
 const row={id:'8078212',teamId:'8941348',name:'Jugador Juvenil',position:null,goals:null,available:false};
 assert.throws(()=>stats(html({player:{codigo_jugador:'8078212',codigo_temporada:'22',codigo_equipo:'846518',competiciones_participa:[{codequipo:'846518',ver_estadisticas:'1'}],partidos:[{nombre:'Total Goles',valor:'4'}]}}),row),/Ficha de otro equipo/);
});
test('identidad y temporada siguen validadas',()=>{
 const row={id:'8078212',teamId:'846518',name:'Jugador Juvenil'};
 assert.throws(()=>stats(html({player:{codigo_jugador:'OTRO',codigo_temporada:'22'}}),row),/otra temporada o jugador/);
 assert.throws(()=>stats(html({player:{codigo_jugador:'8078212',codigo_temporada:'21'}}),row),/otra temporada o jugador/);
});
test('las estadísticas se atribuyen exclusivamente al Juvenil cuando su competición está confirmada',()=>{
 const row={id:'8078212',teamId:'846518',name:'Jugador Juvenil'};
 const value=stats(html({player:{codigo_jugador:'8078212',codigo_temporada:'22',codigo_equipo:'846518',competiciones_participa:[{codequipo:'846518',ver_estadisticas:'1',vis_goles:'1',vis_minutos:'1'}],posicion_jugador:'',no_vis_estadistica:'0',partidos:[{nombre:'Jugados',valor:'3'},{nombre:'Total Goles',valor:'2'}]}}),row);
 assert.equal(value.teamId,'846518');assert.equal(value.goals,2);assert.equal(value.available,true);assert.equal(value.position,null);
});

test('reintenta la ficha temporalmente inaccesible sin inventar estadísticas',async()=>{
 const row={id:'27909129',teamId:'1031230',name:'Jugador de prueba'};
 let calls=0;
 const verified=html({player:{codigo_jugador:row.id,codigo_temporada:'22',codigo_equipo:row.teamId,
  competiciones_participa:[{codequipo:row.teamId,ver_estadisticas:'1',vis_goles:'1'}],
  no_vis_estadistica:'0',partidos:[{nombre:'Jugados',valor:'2'},{nombre:'Total Goles',valor:'1'}]}});
 const result=await loadPlayerDetails(row,{attempts:2,request:async()=>++calls===1?{ok:false,status:503}:{ok:true,text:async()=>verified}});
 assert.equal(calls,2);assert.equal(result.id,row.id);assert.equal(result.teamId,row.teamId);assert.equal(result.goals,1);assert.equal(result.error,false);
});
test('una ficha de otro equipo o temporada nunca se adopta al reintentar',async()=>{
 const row={id:'27909129',teamId:'1031230',name:'Jugador de prueba'};
 let calls=0;
 const foreign=html({player:{codigo_jugador:row.id,codigo_temporada:'22',codigo_equipo:'otro',competiciones_participa:[]}});
 await assert.rejects(loadPlayerDetails(row,{request:async()=>{calls++;return {ok:true,text:async()=>foreign}}}),/Ficha de otro equipo/);
 assert.equal(calls,1);
});
test('si falla definitivamente la RFFM no se fabrican datos deportivos',async()=>{
 const row={id:'27909129',teamId:'1031230',name:'Jugador de prueba'};
 let calls=0;
 await assert.rejects(loadPlayerDetails(row,{attempts:2,request:async()=>{calls++;throw Error('Timeout RFFM')}}),/Timeout RFFM/);
 assert.equal(calls,2);
});
