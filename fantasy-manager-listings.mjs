import policy from './fantasy-game-policy.cjs';
const fail=(message,status=409)=>Object.assign(Error(message),{status});
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(id);
const requestId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(id);

export async function managerListingRoute({db,league,uid,now,method,readBody,playerId=null,players,getNow=()=>now}){
 if(!['GET','POST'].includes(method))throw fail('Método no permitido.',405);
 const value=method==='POST'?await readBody():null;
 if(method==='POST'&&(!requestId(value?.requestId)||!validId(value?.ownershipId)||!validId(value?.playerId)))throw fail('Solicitud del mercado no válida.',400);
 const id=method==='POST'?value.playerId:playerId;
 if(!validId(id))throw fail('Selecciona un jugador de tu plantilla.',400);
 const own=await db.prepare('SELECT * FROM fantasy_roster WHERE league_id=? AND uid=? AND player_id=?').bind(league.id,uid,id).first();
 if(!own)throw fail('Este jugador ya no está en tu plantilla.',404);
 const listed=await db.prepare('SELECT m.*,l.retired_day FROM fantasy_manager_listings m JOIN fantasy_market_listings l ON l.id=m.listing_id WHERE m.league_id=? AND m.ownership_id=? AND l.retired_day IS NULL AND m.expires_at>? ORDER BY m.expires_at DESC LIMIT 1')
  .bind(league.id,own.id,now).first();
 if(method==='GET')return {playerId:id,ownershipId:own.id,listing:listed?{listingId:listed.listing_id,minCents:listed.min_cents,expiresAt:listed.expires_at}:null};
 if(value.ownershipId!==own.id)throw fail('El jugador ha cambiado de propietario.');
 const prior=await db.prepare('SELECT * FROM fantasy_manager_listings WHERE league_id=? AND uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
 if(prior){
  if(prior.ownership_id!==own.id)throw fail('Solicitud utilizada con otro jugador.');
  return {saved:true,listingId:prior.listing_id};
 }
 if(value.cancel===true){
  if(!listed)throw fail('No hay ningún anuncio activo.');
  const reserved=await db.prepare("SELECT COUNT(*) AS n FROM fantasy_auction_bids b JOIN fantasy_auction_rounds r ON r.league_id=b.league_id AND r.listing_id=b.listing_id AND r.day=b.day WHERE b.league_id=? AND b.listing_id=? AND b.status='active' AND r.status='open'").bind(league.id,listed.listing_id).first();
  if(reserved.n)throw fail('Ya existen pujas; no puedes retirar este anuncio.');
  await db.batch([
   db.prepare('UPDATE fantasy_market_listings SET retired_day=? WHERE id=? AND league_id=? AND retired_day IS NULL').bind(policy.madridDay(now),listed.listing_id,league.id),
   db.prepare("UPDATE fantasy_auction_rounds SET status='closed',lease_until=0 WHERE league_id=? AND listing_id=? AND status='open'").bind(league.id,listed.listing_id)
  ]);
  return {saved:true,cancelled:true};
 }
 if(listed)throw fail('Este jugador ya está anunciado en el mercado.');
 const amount=value.minPrice;
 if(!Number.isFinite(amount)||amount<1||amount>1000||Math.abs(amount*100-Math.round(amount*100))>1e-6)
  throw fail('El precio de salida debe estar entre 1 y 1000 M en pasos de 0,01 M.',400);
 const roster=await db.prepare('SELECT COUNT(*) AS n FROM fantasy_roster WHERE league_id=? AND uid=?').bind(league.id,uid).first();
 if(roster.n<=12)throw fail('Debes mantener al menos 12 jugadores.',409);
 const today=policy.madridDay(now),slot=(await db.prepare('SELECT COALESCE(MIN(slot),0)-1 AS slot FROM fantasy_market_listings WHERE league_id=? AND listed_day=?').bind(league.id,today).first()).slot;
 const listingId='manager-'+crypto.randomUUID(),expiresAt=now+7*86400000;
 try{
  await db.batch([
   db.prepare('INSERT INTO fantasy_market_listings(id,league_id,player_id,listed_day,slot) VALUES(?,?,?,?,?)').bind(listingId,league.id,own.player_id,today,slot),
   db.prepare('INSERT INTO fantasy_manager_listings(listing_id,league_id,uid,ownership_id,player_id,min_cents,expires_at,request_id) VALUES(?,?,?,?,?,?,?,?)')
    .bind(listingId,league.id,uid,own.id,own.player_id,Math.round(amount*100),expiresAt,value.requestId)
  ]);
 }catch(e){
  const saved=await db.prepare('SELECT listing_id,ownership_id FROM fantasy_manager_listings WHERE league_id=? AND uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
  if(saved&&saved.ownership_id===own.id)return {saved:true,listingId:saved.listing_id};
  throw fail('El anuncio ha cambiado o el jugador ya está en venta. Actualiza la plantilla.');
 }
 return {saved:true,listingId,expiresAt};
}
