const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function pendingPurchase(db,uid,allowed){return db.prepare(`SELECT t.id,t.league_id,t.player_id,CAST(ROUND(t.amount_units*50) AS INTEGER) AS paid_cents,t.created_at,l.name,l.mode,l.settings_json,COALESCE(g.team_id,json_extract(l.pool_json,'$.teamId')) AS team_id,EXISTS(SELECT 1 FROM fantasy_auction_wins w WHERE w.trade_id=t.id) AS auction
 FROM fantasy_trades t JOIN fantasy_leagues l ON l.id=t.league_id JOIN fantasy_members m ON m.league_id=t.league_id AND m.uid=t.buyer_uid LEFT JOIN fantasy_league_groups g ON g.league_id=t.league_id
 WHERE t.buyer_uid=? AND COALESCE(g.team_id,json_extract(l.pool_json,'$.teamId')) IN(SELECT value FROM json_each(?))
 AND EXISTS(SELECT 1 FROM fantasy_roster r WHERE r.league_id=t.league_id AND r.uid=t.buyer_uid AND r.player_id=t.player_id AND r.acquired_at=t.created_at)
 AND NOT EXISTS(SELECT 1 FROM fantasy_purchase_seen s WHERE s.uid=? AND s.trade_id=t.id) ORDER BY t.created_at DESC,t.id DESC LIMIT 1`).bind(uid,JSON.stringify(allowed),uid).first()}
export async function acknowledgePurchase(db,uid,allowed,tradeId,now){
 if(typeof tradeId!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(tradeId))throw fail('Fichaje no válido.');
 const row=await db.prepare(`SELECT t.id FROM fantasy_trades t JOIN fantasy_leagues l ON l.id=t.league_id JOIN fantasy_members m ON m.league_id=t.league_id AND m.uid=t.buyer_uid LEFT JOIN fantasy_league_groups g ON g.league_id=t.league_id WHERE t.id=? AND t.buyer_uid=? AND COALESCE(g.team_id,json_extract(l.pool_json,'$.teamId')) IN(SELECT value FROM json_each(?))`).bind(tradeId,uid,JSON.stringify(allowed)).first();if(!row)throw fail('Fichaje no encontrado.',404);
 await db.prepare('INSERT OR IGNORE INTO fantasy_purchase_seen(uid,trade_id,seen_at) VALUES(?,?,?)').bind(uid,tradeId,now).run();return {seen:true};
}
