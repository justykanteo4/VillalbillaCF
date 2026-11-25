import policy from './fantasy-game-policy.cjs';
import {settleAuctions} from './fantasy-auctions.mjs';
const fail=(message,status=409)=>Object.assign(Error(message),{status});
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(id);
const requestId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(id);

export async function managerListingRoute({db,league,uid,now,method,readBody,playerId=null,players,getNow=()=>now}){
 await settleAuctions(db,league,now,{limit:20});
 await db.prepare("UPDATE fantasy_market_listings SET retired_day=? WHERE league_id=? AND retired_day IS NULL AND id IN(SELECT listing_id FROM fantasy_manager_listings WHERE league_id=? AND expires_at<=?) AND NOT EXISTS(SELECT 1 FROM fantasy_auction_rounds r WHERE r.league_id=fantasy_market_listings.league_id AND r.listing_id=fantasy_market_listings.id AND r.status='open')").bind(policy.madridDay(now),league.id,league.id,now).run();
 if(!['GET','POST'].includes(method))throw fail('Método no permitido.',405);
 const value=method==='POST'?await readBody():null;
 if(method==='POST'&&(!requestId(value?.requestId)||!validId(value?.ownershipId)||!validId(value?.playerId)))throw fail('Solicitud del mercado no válida.',400);
 const id=method==='POST'?value.playerId:playerId;
 if(!validId(id))throw fail('Selecciona un jugador de tu plantilla.',400);
 const own=await db.prepare('SELECT * FROM fantasy_roster WHERE league_id=? AND uid=? AND player_id=?').bind(league.id,uid,id).first();
 if(!own)throw fail('Este jugador ya no está en tu plantilla.',404);
 const listed=await db.prepare('SELECT m.*,l.retired_day FROM fantasy_manager_listings m JOIN fantasy_market_listings l ON l.id=m.listing_id WHERE m.league_id=? AND m.ownership_id=? AND l.retired_day IS NULL AND m.expires_at>? ORDER BY m.expires_at DESC LIMIT 1')
  .bind(league.id,own.id,now).first();
 if(method==='GET')return {playerId:id,ownershipId:own.id,listing:listed?{listingId:listed.listing_id,minCents:listed.min_cents,expiresAt:listed.expires_at,canWithdrawAt:listed.expires_at-7*86400000,canWithdraw:true}:null};
 if(value.ownershipId!==own.id)throw fail('El jugador ha cambiado de propietario.');
 const prior=await db.prepare('SELECT * FROM fantasy_manager_listings WHERE league_id=? AND uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
 if(prior&&value.cancel!==true){
  if(prior.ownership_id!==own.id)throw fail('Solicitud utilizada con otro jugador.');
  return {saved:true,listingId:prior.listing_id};
 }
 if(value.cancel===true){
  if(!listed)return {saved:true,cancelled:true};
  const at=getNow();
  const result=await db.batch([
   db.prepare("UPDATE fantasy_market_listings SET retired_day=? WHERE id=? AND league_id=? AND retired_day IS NULL AND EXISTS (SELECT 1 FROM fantasy_manager_listings m JOIN fantasy_roster o ON o.id=m.ownership_id AND o.league_id=m.league_id AND o.uid=m.uid WHERE m.listing_id=fantasy_market_listings.id AND m.uid=? AND m.ownership_id=?) AND NOT EXISTS(SELECT 1 FROM fantasy_auction_rounds r WHERE r.league_id=fantasy_market_listings.league_id AND r.listing_id=fantasy_market_listings.id AND r.status='open' AND (r.lease_until>? OR r.closes_at<=?))").bind(policy.madridDay(at),listed.listing_id,league.id,uid,own.id,at,at),
   db.prepare("UPDATE fantasy_auction_rounds SET status='closed',lease_until=0 WHERE league_id=? AND listing_id=? AND status='open' AND EXISTS(SELECT 1 FROM fantasy_market_listings l WHERE l.id=fantasy_auction_rounds.listing_id AND l.league_id=fantasy_auction_rounds.league_id AND l.retired_day IS NOT NULL)").bind(league.id,listed.listing_id),
   db.prepare("UPDATE fantasy_auction_bids SET status='cancelled',updated_at=? WHERE league_id=? AND listing_id=? AND status='active' AND EXISTS(SELECT 1 FROM fantasy_market_listings l WHERE l.id=fantasy_auction_bids.listing_id AND l.league_id=fantasy_auction_bids.league_id AND l.retired_day IS NOT NULL)").bind(at,league.id,listed.listing_id)
  ]);
  if(!result[0]?.meta?.changes)throw fail('La subasta está cerrándose o el jugador ha cambiado de propietario. Actualiza la plantilla.',409);
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
