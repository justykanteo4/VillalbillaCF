function safePhoto(value){if(typeof value!=='string'||!value.trim())return null;try{const url=new URL(value,'https://www.rffm.es');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}
function reportParticipants(game){const staff=[],players=[];let staffAvailable=false;const name=row=>{if(typeof row==='string')return row.trim();if(!row||typeof row!=='object')return '';return String(row.nombre_tecnico||row.nombre_entrenador||row.nombre_jugador||row.nombre||row.nombre_persona||Object.entries(row).find(([k,v])=>/^nombre/.test(k)&&!/equipo|club/.test(k)&&typeof v==='string')?.[1]||'').trim()};
 for(const side of ['local','visitante']){const teamId=String(game['codigo_equipo_'+side]||'');for(const row of game['jugadores_equipo_'+side]||[]){const id=String(row.codjugador||row.cod_jugador||'');if(id&&id!=='-1')players.push({teamId,playerId:id,name:name(row)})}
 for(const [key,value]of Object.entries(game)){if(!/tecnic|entren|delegad|auxiliar/.test(key)||!key.includes(side)||/^(foto|cod|codigo|id)/.test(key))continue;staffAvailable=true;for(const row of Array.isArray(value)?value:[value]){const full=name(row);if(full&&full!=='0'&&full!=='1')staff.push({teamId,name:full,photo:safePhoto(typeof row==='object'?(row.foto||row.foto_tecnico||row.imagen):game['foto_'+key]||game['foto_'+key.replace('2_visitante','_visitante2')]),role:typeof row==='object'?(row.tipo_tecnico||row.cargo||'Cuerpo técnico'):'Cuerpo técnico'})}}
 }
 return {staff,players,staffAvailable};
}
module.exports={reportParticipants};
