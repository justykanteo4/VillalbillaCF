import {saleValueCents} from './fantasy-sale-policy.cjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(value);
function result(sale){return {sold:true,id:sale.id,playerId:sale.player_id,amountCents:sale.amount_cents,marketCents:sale.market_cents}}
export async function saleRoute({db,league,uid,now,method,playerId,readBody,players,getNow=()=>now}){
 if(!['GET','POST'].includes(method))throw fail('Método no permitido.',405);
 const value=method==='POST'?await readBody():null;
 if(method==='POST'){
  if(!value||!validId(value.playerId)||!validId(value.ownershipId)||typeof value.requestId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(value.requestId))throw fail('Solicitud de venta no válida.');
  const previous=await db.prepare('SELECT * FROM fantasy_player_sales WHERE league_id=? AND uid=? AND (request_id=? OR ownership_id=?)').bind(league.id,uid,value.requestId,value.ownershipId).first();
  if(previous){if(previous.player_id!==value.playerId||previous.ownership_id!==value.ownershipId)throw fail('Esta solicitud ya corresponde a otra venta.',409);return result(previous)}
  playerId=value.playerId;
 }
 if(!validId(playerId))throw fail('Selecciona un jugador de tu plantilla.');
 const own=await db.prepare('SELECT id FROM fantasy_roster WHERE league_id=? AND uid=? AND player_id=?').bind(league.id,uid,playerId).first(),p=players.find(p=>p.id===playerId);
 if(!own||!p)throw fail('El jugador ya no pertenece a tu plantilla en esta liga.',404);
 const count=await db.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id=? AND uid=?').bind(league.id,uid).first(),marketCents=Math.round(p.price*100),amountCents=saleValueCents(marketCents),revision=p.priceRevision||0;
 const listed=await db.prepare('SELECT 1 FROM fantasy_manager_listings m JOIN fantasy_market_listings l ON l.id=m.listing_id WHERE m.league_id=? AND m.ownership_id=? AND l.retired_day IS NULL AND m.expires_at>? LIMIT 1').bind(league.id,own.id,now).first();
 // A stale listing can conflict with the unique active-player index when a sale relists the player.
 const conflict=await db.prepare("SELECT l.id FROM fantasy_market_listings l WHERE l.league_id=? AND l.player_id=? AND l.retired_day IS NULL AND (EXISTS(SELECT 1 FROM fantasy_auction_rounds r WHERE r.league_id=l.league_id AND r.listing_id=l.id AND r.status='open') OR EXISTS(SELECT 1 FROM fantasy_auction_bids b WHERE b.league_id=l.league_id AND b.listing_id=l.id AND b.status='active')) LIMIT 1").bind(league.id,playerId).first();
 const hasLoans=await db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='fantasy_player_loans'").first();
 const loan=hasLoans?await db.prepare("SELECT ownership_id FROM fantasy_player_loans WHERE league_id=? AND borrower_uid=? AND status='active'").bind(league.id,uid).all():{results:[]};
 const borrowed=loan.results.some(row=>row.ownership_id===own.id);
 const reason=listed?'Retira el jugador del mercado antes de venderlo directamente.':
  conflict?'Hay una subasta pendiente para este jugador. Actualiza el mercado antes de venderlo.':
  borrowed?'Un jugador cedido no se puede vender ni traspasar.':
  count.n<=12+loan.results.length?'Debes conservar al menos 12 jugadores propios, además de los jugadores cedidos que tendrás que devolver.':null;
 const quote={playerId,name:p.name,ownershipId:own.id,marketCents,amountCents,priceRevision:revision,discountPercent:40,rosterCount:count.n,minRoster:12,canSell:!reason,reason,listed:!!listed};
 if(method==='GET')return quote;
 if(reason)throw fail(reason,409);
 if(count.n<=12)throw fail('La plantilla debe conservar al menos 12 jugadores.',409);
 if(listed)throw fail('Retira el jugador del mercado antes de venderlo directamente.',409);
 if(value.ownershipId!==own.id)throw fail('La propiedad del jugador ha cambiado. Revisa la venta.',409);
 if(value.marketCents!==marketCents||value.amountCents!==amountCents||value.priceRevision!==revision)throw fail('El valor de mercado ha cambiado. Actualiza el importe y confirma de nuevo.',409);
 const sale={id:crypto.randomUUID(),league_id:league.id,uid,player_id:playerId,ownership_id:own.id,request_id:value.requestId,market_cents:marketCents,amount_cents:amountCents,price_revision:revision,created_at:getNow()};
 // Retire only contradictory listings without any open auction or active bid, in the same atomic batch as the sale.
 try{await db.batch([
  db.prepare("UPDATE fantasy_market_listings SET retired_day=? WHERE league_id=? AND player_id=? AND retired_day IS NULL AND NOT EXISTS(SELECT 1 FROM fantasy_manager_listings m WHERE m.listing_id=fantasy_market_listings.id AND m.expires_at>?) AND NOT EXISTS(SELECT 1 FROM fantasy_auction_rounds r WHERE r.league_id=fantasy_market_listings.league_id AND r.listing_id=fantasy_market_listings.id AND r.status='open') AND NOT EXISTS(SELECT 1 FROM fantasy_auction_bids b WHERE b.league_id=fantasy_market_listings.league_id AND b.listing_id=fantasy_market_listings.id AND b.status='active') AND EXISTS(SELECT 1 FROM fantasy_roster WHERE id=? AND league_id=? AND uid=? AND player_id=?)").bind(Math.floor(sale.created_at/86400000),league.id,playerId,sale.created_at,own.id,league.id,uid,playerId),
  db.prepare('INSERT INTO fantasy_player_sales(id,league_id,uid,player_id,ownership_id,request_id,market_cents,amount_cents,price_revision,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(sale.id,league.id,uid,playerId,own.id,value.requestId,marketCents,amountCents,revision,sale.created_at)])}
 catch(e){const previous=await db.prepare('SELECT * FROM fantasy_player_sales WHERE league_id=? AND uid=? AND (request_id=? OR ownership_id=?)').bind(league.id,uid,value.requestId,own.id).first();if(previous&&previous.player_id===playerId&&previous.ownership_id===own.id)return result(previous);if(e.message.includes('FANTASY_LISTED'))throw fail('Retira el jugador del mercado antes de venderlo directamente.',409);if(e.message.includes('FANTASY_ROSTER_MIN'))throw fail('La plantilla debe conservar al menos 12 jugadores.',409);if(e.message.includes('FANTASY_PRICE_CHANGED'))throw fail('El valor de mercado ha cambiado. Actualiza el importe y confirma de nuevo.',409);if(e.message.includes('FANTASY_SALE_OWNERSHIP'))throw fail('El jugador ya se ha vendido o traspasado.',409);if(/fantasy_market_listings\.league_id, fantasy_market_listings\.player_id|FANTASY_LINEUPS_LOCKED/.test(e.message))throw fail('La venta está bloqueada por un anuncio o una alineación pendiente. Actualiza el mercado y vuelve a intentarlo.',409);console.error('Fantasy direct sale failed',String(e.message||e).slice(0,300));throw e}
 return result(sale);
}
