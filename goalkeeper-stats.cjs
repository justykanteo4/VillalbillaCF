const idOf=p=>String(p?.codjugador||p?.cod_jugador||'');
const minute=value=>/^\d+(?:\+\d+)?$/.test(String(value??'').trim())?Number(String(value).split('+')[0])+Number(String(value).split('+')[1]||0)/1000:null;
function reportGoalkeepers(g,{unlimitedChanges=false}={}){
 if(g.acta_cerrada!=='1'||g.suspendido==='1')return null;
 const result=[];
 for(const side of ['local','visitante']){
  const teamId=String(g['codigo_equipo_'+side]),opposite=side==='local'?'visitante':'local',lineup=g['jugadores_equipo_'+side],changes=g['sustituciones_equipo_'+side],cards=g['tarjetas_equipo_'+side],rawGoals=g['goles_equipo_'+opposite],score=g[side==='local'?'goles_visitante':'goles_local'];
  if(!Array.isArray(lineup)||!Array.isArray(changes)||!Array.isArray(cards))continue;
  const keepers=lineup.filter(p=>p.portero==='1'&&idOf(p)&&idOf(p)!=='-1'),active=new Map(),intervals=new Map(),unknown=new Set();
  for(const p of keepers){const id=idOf(p);intervals.set(id,[]);if(p.titular==='1')active.set(id,0)}
  const events=changes.map(e=>({at:minute(e.minuto),out:String(e.codjugador_sale||''),into:String(e.codjugador_entra||'')})).concat(cards.filter(c=>c.codigo_tipo_amonestacion==='101'||c.segunda_amarilla==='1').map(c=>({at:minute(c.minuto),out:idOf(c),into:''})));
  events.sort((a,b)=>(a.at??Infinity)-(b.at??Infinity));
  for(const e of events){if(e.at===null){if(intervals.has(e.out))unknown.add(e.out);if(intervals.has(e.into))unknown.add(e.into);continue}const replacesKeeper=active.has(e.out);if(replacesKeeper){intervals.get(e.out).push([active.get(e.out),e.at]);active.delete(e.out)}if(intervals.has(e.into)){if(!replacesKeeper)unknown.add(e.into);if(active.has(e.into))unknown.add(e.into);else active.set(e.into,e.at)}}
  for(const [id,start]of active)intervals.get(id).push([start,Infinity]);
  // The official final score must agree with the scoring events before attribution.
  const scoreKnown=score!==null&&score!==undefined&&String(score).trim()!==''&&Number.isInteger(Number(score))&&Number(score)>=0;
  const goalsKnown=scoreKnown&&Array.isArray(rawGoals)&&rawGoals.length===Number(score),goals=(rawGoals||[]).map(e=>minute(e.minuto));
  const starters=keepers.filter(p=>p.titular==='1');if(unlimitedChanges&&keepers.length>1)for(const p of keepers)unknown.add(idOf(p));
  for(const p of keepers){const id=idOf(p),spells=intervals.get(id),played=spells.some(([a,b])=>b>a),full=spells.length===1&&spells[0][0]===0&&spells[0][1]===Infinity&&starters.length===1;let conceded=0,valid=p.ver_estadisiticas_jugador!=='0'&&!unknown.has(id)&&starters.length<=1;
   if(played){if(!goalsKnown)valid=false;else if(full)conceded=Number(score);else for(const goal of goals){if(goal===null){valid=false;continue}if(spells.some(([a,b])=>(a!==0&&Math.floor(goal)===Math.floor(a))||(b!==Infinity&&Math.floor(goal)===Math.floor(b)))){valid=false;continue}if(spells.some(([a,b])=>goal>=a&&goal<b))conceded++}}
   result.push({teamId,playerId:id,played:unknown.has(id)?null:played,goalsConceded:valid?conceded:null,cleanSheets:valid?(full&&conceded===0?1:0):null,fullMatch:full});
  }
 }
 return result;
}
function sumGoalkeepers(records,teamId){const byId=new Map();let missing=0,stale=false;const seen=new Set();for(const report of records){if(report.id&&seen.has(report.id))continue;if(report.id)seen.add(report.id);stale||=!!report.stale;if(report.error||!Array.isArray(report.keepers)){missing++;continue}for(const p of report.keepers.filter(p=>p.teamId===teamId)){let row=byId.get(p.playerId);if(!row){row={playerId:p.playerId,goalsConceded:0,cleanSheets:0,goalkeeperPlayed:0,goalkeeperChecked:0,goalkeeperMissing:0};byId.set(p.playerId,row)}if(p.played===null||p.goalsConceded===null||p.cleanSheets===null){row.goalkeeperMissing++;continue}row.goalkeeperChecked++;row.goalsConceded+=p.goalsConceded;row.cleanSheets+=p.cleanSheets;row.goalkeeperPlayed+=Number(p.played)}}return [...byId.values()].map(p=>({...p,goalsConceded:p.goalkeeperChecked?p.goalsConceded:null,cleanSheets:p.goalkeeperChecked?p.cleanSheets:null,goalkeeperMissing:p.goalkeeperMissing+missing,goalkeeperPartial:stale||missing+p.goalkeeperMissing>0,isGoalkeeper:true}))}
module.exports={reportGoalkeepers,sumGoalkeepers};
