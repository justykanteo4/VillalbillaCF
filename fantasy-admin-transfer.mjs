import {madridDay} from './fantasy-market-policy.cjs';

export async function transferFantasyPlayer(db, leagueId, value, now) {
  const {playerId, targetId, ownershipId} = value;
  const transferId = crypto.randomUUID();
  const destination = `EXISTS (SELECT 1 FROM fantasy_managers m
    WHERE m.league_id=? AND m.uid=? AND NOT EXISTS
    (SELECT 1 FROM fantasy_excluded_users e WHERE e.uid=m.uid))
    AND (SELECT COUNT(*) FROM fantasy_roster WHERE league_id=? AND uid=?)<16`;
  const target = [leagueId, targetId, leagueId, targetId];
  const free = 'NOT EXISTS (SELECT 1 FROM fantasy_roster WHERE league_id=? AND player_id=?)';
  const listings = 'SELECT id FROM fantasy_market_listings WHERE league_id=? AND player_id=? AND retired_day IS NULL';
  const statements = [];
  if (ownershipId) {
    statements.push(db.prepare(`UPDATE fantasy_roster AS r SET id=?,uid=?,acquired_at=?,price_units=0
      WHERE id=? AND league_id=? AND player_id=? AND uid<>? AND ${destination}
        AND (SELECT COUNT(*) FROM fantasy_roster s WHERE s.league_id=r.league_id AND s.uid=r.uid)>12`)
      .bind(transferId,targetId,now,ownershipId,leagueId,playerId,targetId,...target));
  }
  const moved = 'EXISTS (SELECT 1 FROM fantasy_roster WHERE id=?)';
  const eligible = ownershipId ? moved : `(${destination}) AND ${free}`;
  const eligibility = ownershipId ? [transferId] : [...target,leagueId,playerId];
  statements.push(
    db.prepare(`UPDATE fantasy_auction_bids SET status='cancelled',updated_at=?
      WHERE league_id=? AND listing_id IN (${listings}) AND status='active' AND ${eligible}`)
      .bind(now,leagueId,leagueId,playerId,...eligibility),
    db.prepare(`UPDATE fantasy_auction_rounds SET status='closed',lease_until=0
      WHERE league_id=? AND listing_id IN (${listings}) AND status='open' AND ${eligible}`)
      .bind(leagueId,leagueId,playerId,...eligibility),
    db.prepare(`UPDATE fantasy_market_listings SET retired_day=? WHERE league_id=? AND player_id=?
      AND retired_day IS NULL AND ${eligible}`)
      .bind(madridDay(now),leagueId,playerId,...eligibility),
  );
  if (ownershipId) {
    statements.push(
      db.prepare(`UPDATE fantasy_offers SET status='cancelled' WHERE league_id=? AND ownership_id=?
        AND status='pending' AND ${moved}`).bind(leagueId,ownershipId,transferId),
      db.prepare(`UPDATE fantasy_lineups SET
        players_json=(SELECT json_group_array(value) FROM json_each(players_json) WHERE value<>?),
        captain_id=CASE WHEN captain_id=? THEN '' ELSE captain_id END, revision=revision+1
        WHERE league_id=? AND uid<>? AND deadline_at>? AND ${moved}
        AND EXISTS (SELECT 1 FROM json_each(players_json) WHERE value=?)`)
        .bind(playerId,playerId,leagueId,targetId,now,transferId,playerId),
    );
  } else {
    statements.push(db.prepare(`INSERT INTO fantasy_roster(id,league_id,uid,player_id,acquired_at,price_units)
      SELECT ?,?,?,?,?,0 WHERE ${destination} AND ${free}`)
      .bind(transferId,leagueId,targetId,playerId,now,...target,leagueId,playerId));
  }
  const results = await db.batch(statements);
  return results[ownershipId ? 0 : results.length-1].meta.changes === 1;
}
