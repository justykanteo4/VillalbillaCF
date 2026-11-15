const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function marketHistory({db,leagueId,uid,players,cursor=null,mine=false}){
 let before=null;if(cursor){try{before=JSON.parse(cursor)}catch{throw fail('Página de movimientos no válida.')}if(!Number.isSafeInteger(before?.at)||before.at<0||!/^(trade|sale)-[A-Za-z0-9_-]{1,100}$/.test(before?.id||''))throw fail('Página de movimientos no válida.')}
 const rows=(await db.prepare(`SELECT * FROM (
 SELECT 'trade-'||t.id AS id,t.player_id,CAST(ROUND(t.amount_units*50) AS INTEGER) AS amount_cents,t.created_at AS at,
 CASE WHEN t.seller_uid IS NULL THEN 'purchase' ELSE 'transfer' END AS kind,
 COALESCE(b.nickname,'Participante') AS buyer,CASE WHEN t.seller_uid IS NULL THEN 'Mercado' ELSE COALESCE(s.nickname,'Participante') END AS seller,
 CASE WHEN t.buyer_uid=? THEN 'buyer' WHEN t.seller_uid=? THEN 'seller' ELSE NULL END AS my_role
 FROM fantasy_trades t LEFT JOIN fantasy_members b ON b.league_id=t.league_id AND b.uid=t.buyer_uid LEFT JOIN fantasy_members s ON s.league_id=t.league_id AND s.uid=t.seller_uid WHERE t.league_id=?
 UNION ALL
 SELECT 'sale-'||p.id AS id,p.player_id,p.amount_cents,p.created_at AS at,'sale' AS kind,'Mercado' AS buyer,COALESCE(s.nickname,'Participante') AS seller,
 CASE WHEN p.uid=? THEN 'seller' ELSE NULL END AS my_role
 FROM fantasy_player_sales p LEFT JOIN fantasy_members s ON s.league_id=p.league_id AND s.uid=p.uid WHERE p.league_id=?
 ) WHERE (?=0 OR my_role IS NOT NULL) AND (? IS NULL OR at<? OR (at=? AND id<?)) ORDER BY at DESC,id DESC LIMIT 21`).bind(uid,uid,leagueId,uid,leagueId,mine?1:0,before?.at??null,before?.at??null,before?.at??null,before?.id??null).all()).results;
 const directory=new Map(players.map(p=>[String(p.id),p])),page=rows.slice(0,20),last=page.at(-1);
 return {movements:page.map(row=>{const p=directory.get(String(row.player_id));return {id:row.id,playerId:String(row.player_id),playerName:p?.name||'Jugador',teamId:p?.teamId||null,amount:row.amount_cents/100,at:row.at,kind:row.kind,buyer:row.buyer,seller:row.seller,mine:!!row.my_role,myRole:row.my_role}}),nextCursor:rows.length>20?JSON.stringify({at:last.at,id:last.id}):null};
}
