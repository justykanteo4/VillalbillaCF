const {awardBonus}=require('./fantasy-award-policy.cjs');
const {playerScore}=require('./fantasy-game-policy.cjs');
function defenderCleanSheet(player,match,position){
 if(!player?.played||String(position||'').trim().toLocaleLowerCase('es')!=='defensa')return false;
 if(!Number.isInteger(match?.homeScore)||!Number.isInteger(match?.awayScore)||match.homeScore<0||match.awayScore<0)return false;
 // El parte deportivo identifica victoria/empate desde el punto de vista del equipo.
 // Una victoria con un marcador a cero significa que el rival no marcó.
 return player.draw?match.homeScore===0&&match.awayScore===0
  :!!player.win&&(match.homeScore===0||match.awayScore===0);
}
function matchPlayerPoints(player,match,points,awards=[],position=''){return playerScore(player,points)+(defenderCleanSheet(player,match,position)&&!player.cleanSheet?(points?.cleanSheet||0):0)+(player.win?awards.filter(a=>a.match_id===match.id&&a.team_id===match.teamId&&a.player_id===player.id).reduce((n,a)=>n+awardBonus(a.kind,points,match.week),0):0)}
function lineupPoints({matches,awards,points,week,selected,captainId,now,players=[]}){if(selected.length!==11||new Set(selected).size!==11||!selected.includes(captainId))return [];const rows=new Map(selected.map(playerId=>[playerId,{playerId,points:0,captain:playerId===captainId,confirmedMatches:0,partial:false}])),directory=new Map(players.map(p=>[p.id,p]));for(const match of matches){if(match.week!==week||match.startsAt>now)continue;for(const row of rows.values()){const p=match.players.find(p=>p.id===row.playerId),known=directory.get(row.playerId),teamIds=known?.teams?.map(t=>t.id)||[known?.teamId];if(p||teamIds.includes(match.teamId))row.confirmedMatches++;if(!p)continue;row.points+=matchPlayerPoints(p,match,points,awards,known?.position)*(row.captain&&Number.isInteger(points?.captain)&&points.captain>=1&&points.captain<=5?points.captain:row.captain?2:1);row.partial||=!!p.partial}}return [...rows.values()]}
module.exports={defenderCleanSheet,matchPlayerPoints,lineupPoints};
