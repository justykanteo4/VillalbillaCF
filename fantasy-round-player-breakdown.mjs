import {matchPlayerPoints} from './fantasy-lineup-points.cjs';
import policy from './fantasy-game-policy.cjs';
import {sports} from './fantasy-game.mjs';
import catalog from './fantasy-players.json' with {type:'json'};
const names=new Map(catalog.teams.flatMap(team=>team.players.map(player=>[String(player.id),player.name])));
const positionsBase=new Map(catalog.teams.flatMap(team=>team.players.map(player=>[String(player.id),player.position])));
const all=async statement=>(await statement.all()).results;
const fail=(message,status=400)=>Object.assign(Error(message),{status});

/**
 * Reproduce el cálculo de leagueStandings exclusivamente para una jornada y
 * participante, sin modificar actas, alineaciones ni datos de otros usuarios.
 */
export async function roundPlayerBreakdown(db,league,memberUid,week,now){
 if(!Number.isSafeInteger(week)||week<0)throw fail('Jornada no válida.',400);
 const member=await db.prepare('SELECT nickname FROM fantasy_members WHERE league_id=? AND uid=?').bind(league.id,memberUid).first();
 if(!member)throw fail('Participante no encontrado en esta liga.',404);
 const [lineup,contracts,awards,bonus,manual,snapshot]=await Promise.all([
  db.prepare('SELECT players_json,captain_id FROM fantasy_lineups WHERE league_id=? AND uid=? AND week=?').bind(league.id,memberUid,week).first(),
  all(db.prepare('SELECT coach_id,starts_at,ends_at FROM fantasy_coach_contracts WHERE league_id=? AND uid=?').bind(league.id,memberUid)),
  all(db.prepare('SELECT * FROM fantasy_awards WHERE week=?').bind(week)),
  db.prepare('SELECT multiplier FROM fantasy_special_rounds WHERE league_id=? AND week=?').bind(league.id,week).first(),
  all(db.prepare('SELECT player_id,position FROM fantasy_player_positions')),
  sports(db)
 ]);
 const multiplier=bonus?.multiplier||1;
 const positions=new Map(positionsBase);
 for(const row of manual)if(row.position)positions.set(String(row.player_id),row.position);
 let selected=[];
 try{selected=lineup?JSON.parse(lineup.players_json):[]}catch{selected=[]}
 const valid=selected.length===11&&new Set(selected).size===11&&selected.includes(lineup?.captain_id);
 const entries=new Map(valid?selected.map(playerId=>[String(playerId),{
  playerId:String(playerId),name:names.get(String(playerId))||'Jugador '+playerId,
  position:positions.get(String(playerId))||null,captain:playerId===lineup.captain_id,
  points:0,playedMatches:0,partial:false
 }]):[]);
 const coachPoints=new Map();
 let counted=0;
 for(const match of snapshot.matches){
  if(match.week!==week||match.startsAt>now)continue;
  counted++;
  if(valid){
   for(const player of match.players||[]){
    const entry=entries.get(String(player.id));
    if(!entry)continue;
    if(!names.has(String(player.id))&&player.name)entry.name=player.name;
    const base=matchPlayerPoints(player,match,league.settings.points,awards,entry.position);
    const factor=entry.captain?2:1; // Identico al cálculo de clasificación.
    entry.points+=base*factor*multiplier;
    entry.playedMatches+=player.played?1:0;
    entry.partial||=!!player.partial;
   }
  }
  const contract=contracts.find(c=>c.starts_at<=(match.eligibleAt??match.startsAt)&&(c.ends_at===null||c.ends_at>(match.eligibleAt??match.startsAt)));
  if(contract){
   const coach=match.coaches?.find(c=>c.id===contract.coach_id);
   if(coach){
    const value=policy.coachScore(coach)*multiplier;
    coachPoints.set(contract.coach_id,(coachPoints.get(contract.coach_id)||0)+value);
   }
  }
 }
 const players=[...entries.values()].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'es'));
 const coaches=[...coachPoints].map(([coachId,points])=>({coachId,points}));
 const total=players.reduce((sum,p)=>sum+p.points,0)+coaches.reduce((sum,c)=>sum+c.points,0);
 return {memberId:memberUid,nickname:member.nickname,week,total,players,coaches,
  validLineup:valid,confirmedMatches:counted,partial:players.some(p=>p.partial)};
}
