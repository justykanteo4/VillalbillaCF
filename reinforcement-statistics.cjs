const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const finiteScore=v=>v!==null&&v!==undefined&&v!==''&&Number.isInteger(Number(v))&&Number(v)>=0?Number(v):null;
function appearanceStats(report,fixture,side,playerId){
 const teamId=String(report.minutesSource['codigo_equipo_'+side]),lineup=report.minutesSource['jugadores_equipo_'+side],cards=report.minutesSource['tarjetas_equipo_'+side],entered=report.minutesSource['sustituciones_equipo_'+side]||[];
 const starter=lineup.some(p=>String(p.codjugador)===playerId&&p.titular==='1'),played=starter||entered.some(e=>String(e.codjugador_entra)===playerId&&/^\d+(?:\+\d+)?$/.test(String(e.minuto)));
 const ownCards=Array.isArray(cards)?cards.filter(c=>String(c.codjugador)===playerId):null;
 const yellow=ownCards?ownCards.filter(c=>c.codigo_tipo_amonestacion==='100'||c.segunda_amarilla==='1').length:null,red=ownCards?ownCards.filter(c=>c.codigo_tipo_amonestacion==='101'||c.segunda_amarilla==='1').length:null;
 const homeScore=finiteScore(report.homeScore??fixture.homeScore),awayScore=finiteScore(report.awayScore??fixture.awayScore),goalsComplete=report.goalsAvailable===true&&Array.isArray(report.goals)&&homeScore!==null&&awayScore!==null&&report.goals.length===homeScore+awayScore;
 let goals=goalsComplete?0:null;
 if(goalsComplete)for(const goal of report.goals){
  if(goal.type==='Propia puerta')continue;
  let goalTeam=goal.teamId?String(goal.teamId):null;
  if(!goalTeam){const home=normalize(fixture.home),away=normalize(fixture.away),label=normalize(goal.team);if(label&&home!==away){if(label===home)goalTeam=String(report.homeId);else if(label===away)goalTeam=String(report.awayId)}}
  if(goalTeam&&goalTeam!==teamId)continue;
  let owner=goal.playerId?String(goal.playerId):null;
  if(!owner){const matches=(report.players||[]).filter(p=>(!goalTeam||String(p.teamId)===goalTeam)&&normalize(p.name)===normalize(goal.name));if(matches.length===1){owner=String(matches[0].playerId);goalTeam=String(matches[0].teamId)}}
  if(goalTeam&&goalTeam!==teamId)continue;
  if(goalTeam!==teamId||!owner){goals=null;break}
  if(owner===playerId)goals++;
 }
 return {goals,yellow,red,played:played?1:0,calledUp:1,statisticsVersion:2};
}
function aggregateReinforcementStats(records,players){
 const usable=records.filter(r=>!r.error&&r.statisticsVersion===2),partial=records.some(r=>r.error||r.stale||r.statisticsVersion!==2);
 return players.map(player=>{const rows=usable.flatMap(r=>(r.callUps||r.players||[]).filter(p=>p.id===player.id)),sum=key=>rows.length&&rows.every(p=>Number.isInteger(p[key]))?rows.reduce((n,p)=>n+p[key],0):null,played=sum('played'),calledUp=sum('calledUp');return {...player,goals:sum('goals'),yellow:sum('yellow'),red:sum('red'),played,calledUp,notCalledUp:!partial&&calledUp!==null?Math.max(0,usable.length-calledUp):null,available:true,scope:'team',statisticsVersion:2,statisticsPartial:partial||rows.some(p=>[p.goals,p.yellow,p.red].some(v=>v===null))}});
}
module.exports={appearanceStats,aggregateReinforcementStats};
