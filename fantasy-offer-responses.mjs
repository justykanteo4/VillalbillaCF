import catalog from './fantasy-players.json' with {type:'json'};
const names=new Map(catalog.teams.flatMap(t=>t.players.map(p=>[p.id,p.name])));
export async function dispatchOfferResponses(env,{send=fetch,now=Date.now(),closed=false}={}){
 const db=env.CHAT_DB,privateDb=env.VISITS_DB;if(!db||!privateDb)return;
 const events=(await db.prepare(`SELECT e.offer_id,o.buyer_uid FROM fantasy_offer_responses e JOIN fantasy_offers o ON o.id=e.offer_id WHERE e.queued_at IS NULL AND e.created_at>=? ORDER BY e.created_at LIMIT 10`).bind(now-7*86400000).all()).results;
 for(const e of events){
  const tokens=(await privateDb.prepare(closed?'SELECT s.id FROM access_push_tokens s JOIN access_admin_devices a ON a.token_id=s.id AND a.uid=s.uid WHERE s.uid=? AND s.enabled=1':'SELECT id FROM access_push_tokens WHERE uid=? AND enabled=1').bind(e.buyer_uid).all()).results;
  await db.batch([...tokens.map(t=>db.prepare('INSERT INTO fantasy_offer_response_jobs(offer_id,token_id,uid) VALUES(?,?,?) ON CONFLICT(offer_id,token_id) DO NOTHING').bind(e.offer_id,t.id,e.buyer_uid)),db.prepare('UPDATE fantasy_offer_responses SET queued_at=? WHERE offer_id=? AND queued_at IS NULL').bind(now,e.offer_id)]);
 }
 const jobs=(await db.prepare(`SELECT j.*,e.status AS decision,o.status AS offer_status,o.league_id,o.buyer_uid,o.player_id,o.amount_units,s.nickname AS seller FROM fantasy_offer_response_jobs j JOIN fantasy_offer_responses e ON e.offer_id=j.offer_id JOIN fantasy_offers o ON o.id=j.offer_id LEFT JOIN fantasy_members s ON s.league_id=o.league_id AND s.uid=o.seller_uid WHERE j.attempts<5 AND j.next_at<=? AND (j.status='pending' OR j.status='sending' AND j.claimed_at<?) ORDER BY e.created_at LIMIT 5`).bind(now,now-120000).all()).results;
 for(const job of jobs){
  const token=await privateDb.prepare(closed?'SELECT s.token FROM access_push_tokens s JOIN access_admin_devices a ON a.token_id=s.id AND a.uid=s.uid WHERE s.id=? AND s.uid=? AND s.enabled=1':'SELECT token FROM access_push_tokens WHERE id=? AND uid=? AND enabled=1').bind(job.token_id,job.buyer_uid).first();
  const member=await db.prepare(`SELECT 1 FROM fantasy_members m JOIN fantasy_leagues l ON l.id=m.league_id LEFT JOIN fantasy_league_groups g ON g.league_id=l.id JOIN fantasy_participant_teams p ON p.uid=m.uid AND p.team_id=COALESCE(g.team_id,json_extract(l.pool_json,'$.teamId')) WHERE m.league_id=? AND m.uid=?`).bind(job.league_id,job.buyer_uid).first();
  if(!token||!member||job.uid!==job.buyer_uid||job.decision!==job.offer_status){await db.prepare("UPDATE fantasy_offer_response_jobs SET status='cancelled' WHERE offer_id=? AND token_id=?").bind(job.offer_id,job.token_id).run();continue}
  const claim=await db.prepare("UPDATE fantasy_offer_response_jobs SET status='sending',claimed_at=?,attempts=attempts+1 WHERE offer_id=? AND token_id=? AND (status='pending' OR status='sending' AND claimed_at<?) RETURNING offer_id").bind(now,job.offer_id,job.token_id,now-120000).first();if(!claim)continue;
  try{
   const name=names.get(job.player_id)||'el jugador',accepted=job.decision==='accepted',amount=(job.amount_units/2).toLocaleString('es-ES',{maximumFractionDigits:2});
   const response=await send('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:token.token,title:(accepted?'Oferta aceptada: ':'Oferta rechazada: ')+name,body:(job.seller||'El propietario')+' ha '+(accepted?'aceptado':'rechazado')+' tu oferta de '+amount+' M por '+name+'. Pulsa para ver la oferta en Fantasy.',sound:'default',priority:'high',channelId:'club',data:{notificationId:'fantasy-offer-response-'+job.offer_id,destination:{type:'fantasy-offers',leagueId:job.league_id}}}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Push no disponible');const ticket=(await response.json()).data;
   if(ticket?.status!=='ok'){if(ticket?.details?.error==='DeviceNotRegistered')await privateDb.prepare('UPDATE access_push_tokens SET enabled=0 WHERE id=?').bind(job.token_id).run();throw Error('Push rechazado')}
   await db.prepare("UPDATE fantasy_offer_response_jobs SET status='accepted',ticket=? WHERE offer_id=? AND token_id=?").bind(ticket.id||null,job.offer_id,job.token_id).run();
  }catch{await db.prepare("UPDATE fantasy_offer_response_jobs SET status='pending',next_at=? WHERE offer_id=? AND token_id=?").bind(now+60000,job.offer_id,job.token_id).run()}
 }
 await db.prepare('DELETE FROM fantasy_offer_response_jobs WHERE offer_id IN(SELECT offer_id FROM fantasy_offer_responses WHERE created_at<?)').bind(now-7*86400000).run();
 await db.prepare('DELETE FROM fantasy_offer_responses WHERE created_at<?').bind(now-7*86400000).run();
}
