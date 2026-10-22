const {cleanName}=require('./team-identity.cjs');
const SOURCE='https://www.rffm.es/competicion/calendario?competicion=26737706&grupo=26737710&temporada=22&tipojuego=1';
function parseCalendar(html){
 const match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(!match)throw Error('La federación no ha enviado un calendario válido.');
 const p=JSON.parse(match[1]).props.pageProps;
 if(p.query.grupo!=='26737710'||p.query.temporada!=='22'||!Array.isArray(p.calendar.rounds))throw Error('Calendario de otra competición.');
 const fixtures=p.calendar.rounds.flatMap(r=>r.equipos.filter(m=>m.codigo_equipo_local==='680163'||m.codigo_equipo_visitante==='680163').map(m=>({id:String(m.codacta),round:Number(r.codjornada),homeId:String(m.codigo_equipo_local),awayId:String(m.codigo_equipo_visitante),home:cleanName(m.equipo_local),away:cleanName(m.equipo_visitante),date:m.fecha?m.fecha.split('-').reverse().join('-'):null,time:m.hora||null,venue:m.campo||null,venueId:m.codigo_campo||null,homeScore:m.goles_casa,awayScore:m.goles_visitante})));
 if(!fixtures.length)throw Error('No se han encontrado partidos de Villalbilla.');
 return {source:SOURCE,updatedAt:new Date().toISOString(),fixtures};
}
module.exports={SOURCE,parseCalendar};
