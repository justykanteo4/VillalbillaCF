import {gameRoute} from './fantasy-game.mjs';
import {seasonFromDate,seasonSummary} from './fantasy-season-history.cjs';
import {roundTables} from './fantasy-round-tables.cjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const validSeason=value=>{
 if(typeof value!=='string'||!/^20[0-9]{2}\/[0-9]{2}$/.test(value))return false;
 const start=Number(value.slice(0,4));
 return value.slice(-2)===String(start+1).slice(-2);
};
const mapArchive=row=>({season:row.season,closedAt:row.closed_at,standings:JSON.parse(row.standings_json),rounds:JSON.parse(row.rounds_json)});
export async function listSeasonArchives(db,leagueId){
 const rows=(await db.prepare('SELECT season,standings_json,rounds_json,closed_at FROM fantasy_season_archives WHERE league_id=? ORDER BY season DESC LIMIT 20').bind(leagueId).all()).results;
 return {archives:rows.map(mapArchive)};
}
export async function archiveFantasySeason({db,leagueId,season,confirmation,actorUid,now}){
 if(!validSeason(season)||confirmation!=='CERRAR '+season)throw fail('Para guardar la temporada escribe CERRAR y la temporada exacta.',409);
 const existing=await db.prepare('SELECT season,standings_json,rounds_json,closed_at FROM fantasy_season_archives WHERE league_id=? AND season=?').bind(leagueId,season).first();
 if(existing)return {saved:true,archive:mapArchive(existing),alreadyClosed:true};
 const row=await db.prepare('SELECT id,created_at,settings_json FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
 if(!row)throw fail('No se encontró la liga.',404);
 const settings=JSON.parse(row.settings_json),league={id:row.id,createdAt:row.created_at,settings};
 const board=await gameRoute({db,league,uid:actorUid,now,action:'table',method:'GET'});
 const standings=seasonSummary(board.rows,season).map(({nickname,points,rounds,rank})=>({nickname,points,rounds,rank}));
 const rounds=roundTables(board.rows).filter(r=>seasonFromDate(r.date)===season).map(r=>({
  week:r.week,date:r.date,rows:r.rows.map(({nickname,rank,points})=>({nickname,rank,points}))
 }));
 if(!standings.length||!rounds.length)throw fail('Esta temporada todavía no tiene jornadas confirmadas.',409);
 const standingsJson=JSON.stringify(standings),roundsJson=JSON.stringify(rounds);
 await db.prepare('INSERT OR IGNORE INTO fantasy_season_archives(league_id,season,standings_json,rounds_json,closed_at,closed_by) VALUES(?,?,?,?,?,?)').bind(leagueId,season,standingsJson,roundsJson,now,actorUid).run();
 const saved=await db.prepare('SELECT season,standings_json,rounds_json,closed_at FROM fantasy_season_archives WHERE league_id=? AND season=?').bind(leagueId,season).first();
 if(!saved)throw fail('No se pudo archivar la temporada.',503);
 return {saved:true,archive:mapArchive(saved),alreadyClosed:saved.closed_at!==now};
}
