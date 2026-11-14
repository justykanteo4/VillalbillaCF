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
 const quote={playerId,name:p.name,ownershipId:own.id,marketCents,amountCents,priceRevision:revision,discountPercent:8,rosterCount:count.n,minRoster:12,canSell:count.n>12};
 if(method==='GET')return quote;
 if(count.n<=12)throw fail('La plantilla debe conservar al menos 12 jugadores.',409);
 if(value.ownershipId!==own.id)throw fail('La propiedad del jugador ha cambiado. Revisa la venta.',409);
 if(value.marketCents!==marketCents||value.amountCents!==amountCents||value.priceRevision!==revision)throw fail('El valor de mercado ha cambiado. Actualiza el importe y confirma de nuevo.',409);
 const sale={id:crypto.randomUUID(),league_id:league.id,uid,player_id:playerId,ownership_id:own.id,request_id:value.requestId,market_cents:marketCents,amount_cents:amountCents,price_revision:revision,created_at:getNow()};
 try{await db.prepare('INSERT INTO fantasy_player_sales VALUES(?,?,?,?,?,?,?,?,?,?)').bind(sale.id,league.id,uid,playerId,own.id,value.requestId,marketCents,amountCents,revision,sale.created_at).run()}
 catch(e){const previous=await db.prepare('SELECT * FROM fantasy_player_sales WHERE league_id=? AND uid=? AND (request_id=? OR ownership_id=?)').bind(league.id,uid,value.requestId,own.id).first();if(previous&&previous.player_id===playerId&&previous.ownership_id===own.id)return result(previous);if(e.message.includes('FANTASY_ROSTER_MIN'))throw fail('La plantilla debe conservar al menos 12 jugadores.',409);if(e.message.includes('FANTASY_PRICE_CHANGED'))throw fail('El valor de mercado ha cambiado. Actualiza el importe y confirma de nuevo.',409);if(e.message.includes('FANTASY_SALE_OWNERSHIP'))throw fail('El jugador ya se ha vendido o traspasado.',409);throw e}
 return result(sale);
}
