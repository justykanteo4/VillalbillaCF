const labels={player:'mejor jugador',team:'mejor equipo',trainer:'mejor entrenador',goalkeeper:'mejor portero'};
// Ballot triggers commit events atomically. Delivery never changes a ballot.
export async function dispatchVoteNotifications(env,{send=fetch,now=Date.now()}={}){
 const db=env.CHAT_DB,privateDb=env.VISITS_DB;if(!db||!privateDb)return;
 const admins=await privateDb.prepare('SELECT a.token_id,a.uid,s.token FROM access_admin_devices a JOIN access_push_tokens s ON s.id=a.token_id AND s.uid=a.uid AND s.enabled=1').all();
 for(const admin of admins.results)await db.prepare('INSERT OR IGNORE INTO vote_notice_jobs(event_id,token_id,admin_uid) SELECT id,?,? FROM vote_notice_events WHERE created_at>=?').bind(admin.token_id,admin.uid,now-86400000).run();
 await db.prepare("UPDATE vote_notice_jobs SET status='pending' WHERE status='sending' AND claimed_at<?").bind(now-120000).run();
 const jobs=await db.prepare("SELECT j.*,e.category,e.points FROM vote_notice_jobs j JOIN vote_notice_events e ON e.id=j.event_id WHERE j.status='pending' AND j.attempts<5 AND j.next_at<=? AND e.created_at>=? ORDER BY e.created_at,j.event_id LIMIT 5").bind(now,now-86400000).all();
 await Promise.all(jobs.results.map(async job=>{
  const admin=await privateDb.prepare('SELECT s.token FROM access_admin_devices a JOIN access_push_tokens s ON s.id=a.token_id AND s.uid=a.uid AND s.enabled=1 WHERE a.token_id=? AND a.uid=?').bind(job.token_id,job.admin_uid).first();
  if(!admin){await db.prepare("UPDATE vote_notice_jobs SET status='cancelled' WHERE event_id=? AND token_id=? AND admin_uid=?").bind(job.event_id,job.token_id,job.admin_uid).run();return}
  const claim=await db.prepare("UPDATE vote_notice_jobs SET status='sending',claimed_at=?,attempts=attempts+1 WHERE event_id=? AND token_id=? AND admin_uid=? AND status='pending'").bind(now,job.event_id,job.token_id,job.admin_uid).run();if(!claim.meta?.changes)return;
  try{
   const response=await send('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:admin.token,title:'Nuevo voto del club',body:`Se ha registrado una elección de ${job.points} ${job.points===1?'punto':'puntos'} a ${labels[job.category]||'una candidatura'}. Pulsa para ver Votaciones.`,sound:'default',priority:'high',channelId:'club',data:{notificationId:'vote-'+job.event_id,destination:{type:'section',section:'votes'}}}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Push unavailable');const ticket=(await response.json()).data;if(ticket?.status!=='ok'){if(ticket?.details?.error==='DeviceNotRegistered')await privateDb.prepare('UPDATE access_push_tokens SET enabled=0 WHERE id=?').bind(job.token_id).run();throw Error('Push rejected')}
   await db.prepare("UPDATE vote_notice_jobs SET status='accepted',ticket=? WHERE event_id=? AND token_id=? AND admin_uid=?").bind(ticket.id||null,job.event_id,job.token_id,job.admin_uid).run();
  }catch{await db.prepare("UPDATE vote_notice_jobs SET status='pending',next_at=? WHERE event_id=? AND token_id=? AND admin_uid=?").bind(now+60000,job.event_id,job.token_id,job.admin_uid).run()}
 }));
 await db.prepare('DELETE FROM vote_notice_jobs WHERE event_id IN(SELECT id FROM vote_notice_events WHERE created_at<?)').bind(now-7*86400000).run();await db.prepare('DELETE FROM vote_notice_events WHERE created_at<?').bind(now-7*86400000).run();
}
