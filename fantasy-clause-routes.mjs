import clauses from './fantasy-clauses.cjs';
import policy from './fantasy-game-policy.cjs';
import {weeklyBudget} from './fantasy-leagues.cjs';
import {reservedBids} from './fantasy-auctions.mjs';

const fail=(message,status=409)=>Object.assign(Error(message),{status});
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(value);
const validOwnership=value=>typeof value==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(value);
const all=async q=>(await q.all()).results;
const cents=value=>Math.round(value*100);

// Count completed fixture rounds for this specific league's team.
// The three-hour completion offset avoids unlocking protection at kickoff.
export function completedRounds(schedule,teamId,at){
  const fixtures=(schedule||[]).filter(f=>String(f.teamId)===String(teamId)
    && Number.isFinite(f.startsAt));
  const days=new Map();
  for(const f of fixtures){
    const key=f.week??policy.weekKey(f.startsAt);
    days.set(key,Math.max(days.get(key)||0,f.startsAt+3*3600000));
  }
  if(!days.size)return null;
  return [...days.values()].filter(end=>end<=at).length;
}

async function ownerQuote(db,league,uid,ownershipId,players,schedule,now){
  const own=await db.prepare('SELECT r.*,m.nickname AS owner_name FROM fantasy_roster r JOIN fantasy_members m ON m.league_id=r.league_id AND m.uid=r.uid WHERE r.league_id=? AND r.id=?').bind(league.id,ownershipId).first();
  if(!own)throw fail('El jugador ya no pertenece a esta liga.',404);
  const player=players.find(p=>p.id===own.player_id);
  if(!player)throw fail('El jugador no está disponible en el catálogo.',404);
  const currentRound=completedRounds(schedule,league.teamId,now);
  const acquiredRound=completedRounds(schedule,league.teamId,own.acquired_at);
  const boosts=currentRound===null?[]:(await db.prepare(
    'SELECT amount_cents,start_round FROM fantasy_clause_boost_events WHERE ownership_id=? AND league_id=? AND start_round<=? AND start_round+2>?'
    ).bind(own.id,league.id,currentRound,currentRound).all()).results;
  // Each payment has its own two-round expiry; later payments never extend older ones.
  const activeBoost=boosts.reduce((total,e)=>total+e.amount_cents*2,0);
  const boostExpiresRound=boosts.length?Math.max(...boosts.map(e=>e.start_round+2)):null;
  // Assigned starter players cost zero; use their market value as the
  // acquisition reference until a paid transfer establishes a purchase price.
  const purchasePrice=own.price_units>0?own.price_units/2:player.price;
  const baseCents=clauses.initialClauseCents(purchasePrice);
  return {own,player,currentRound,acquiredRound,purchasePrice,baseCents,
    amountCents:baseCents+activeBoost,boostCents:activeBoost,
    boostExpiresRound,
    protectedRoundsRemaining:currentRound===null||acquiredRound===null?2:Math.max(0,acquiredRound+2-currentRound),
    enabled:league.settings.clausesEnabled===true,mine:own.uid===uid};
}

async function balanceInfo(db,league,uid,now){
  const member=await db.prepare('SELECT joined_at FROM fantasy_members WHERE league_id=? AND uid=?').bind(league.id,uid).first();
  if(!member)throw fail('No perteneces a esta liga.',403);
  const grossCents=cents(weeklyBudget(league.settings,member.joined_at,now).balance);
  const wallet=await db.prepare('SELECT delta_cents FROM fantasy_wallet_cents WHERE league_id=? AND uid=?').bind(league.id,uid).first();
  const held=await reservedBids(db,league.id,uid);
  return {grossCents,balanceCents:grossCents+(wallet?.delta_cents||0),reservedCents:held};
}

export async function clauseRoute({db,league,uid,now,action,method,readBody,players,schedule,canPlay=async()=>true,getNow=()=>now,ownershipId=null}){
  if(method==='GET'&&action==='clause'){
    if(!validOwnership(ownershipId))throw fail('Selecciona un jugador.',400);
    const quote=await ownerQuote(db,league,uid,ownershipId,players,schedule,now);
    return {ownershipId:quote.own.id,playerId:quote.own.player_id,playerName:quote.player.name,
      owner:quote.own.owner_name,amountCents:quote.amountCents,baseCents:quote.baseCents,
      boostCents:quote.boostCents,boostExpiresRound:quote.boostExpiresRound,
      protectedRoundsRemaining:quote.protectedRoundsRemaining,
      enabled:quote.enabled,mine:quote.mine,purchasePrice:quote.purchasePrice,
      currentRound:quote.currentRound};
  }
  if(method!=='POST'||!['clause','clause/boost'].includes(action))throw fail('Método no permitido.',405);
  const value=await readBody();
  if(!value||!validId(value.requestId)||!validOwnership(value.ownershipId))throw fail('Solicitud de cláusula no válida.',400);
  if(!league.settings.clausesEnabled)throw fail('El club todavía no ha activado las cláusulas.');
  const nowAccepted=getNow(),boost=action==='clause/boost';
  const previous=boost?
    await db.prepare('SELECT * FROM fantasy_clause_boost_events WHERE league_id=? AND uid=? AND request_id=?').bind(league.id,uid,value.requestId).first():
    await db.prepare('SELECT * FROM fantasy_clause_purchases WHERE league_id=? AND buyer_uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
  if(previous){
    if(previous.ownership_id!==value.ownershipId)throw fail('Solicitud reutilizada con otro jugador.');
    return {saved:true,id:previous.id,amountCents:boost?previous.amount_cents:previous.amount_cents};
  }
  const quote=await ownerQuote(db,league,uid,value.ownershipId,players,schedule,nowAccepted);
  if(quote.currentRound===null)throw fail('Falta el calendario oficial para calcular las jornadas.');
  const funds=await balanceInfo(db,league,uid,nowAccepted);
  if(boost){
    if(!quote.mine)throw fail('Solo puedes subir la cláusula de tus propios jugadores.',403);
    const amount=value.amount;
    if(!Number.isFinite(amount)||amount<0.01||amount>1000||Math.abs(amount*100-Math.round(amount*100))>1e-6)
      throw fail('Indica cuánto deseas pagar en pasos de 0,01 M.',400);
    const paid=cents(amount),id=crypto.randomUUID();
    try{
      await db.prepare('INSERT INTO fantasy_clause_boost_events(id,league_id,uid,ownership_id,amount_cents,gross_cents,created_at,start_round,request_id) VALUES(?,?,?,?,?,?,?,?,?)')
        .bind(id,league.id,uid,quote.own.id,paid,funds.grossCents,nowAccepted,quote.currentRound,value.requestId).run();
    }catch(e){
      const seen=await db.prepare('SELECT * FROM fantasy_clause_boost_events WHERE league_id=? AND uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
      if(seen&&seen.ownership_id===quote.own.id&&seen.amount_cents===paid)return {saved:true,id:seen.id,amountCents:paid};
      throw fail(e.message.includes('FANTASY_FUNDS')?'Saldo disponible insuficiente.':'No se pudo aumentar la cláusula.');
    }
    return {saved:true,id,amountCents:paid,addedCents:paid*2};
  }
  if(quote.mine)throw fail('No puedes pagar la cláusula de tu jugador.');
  if(!await canPlay(quote.own.uid))throw fail('El propietario ya no participa en esta liga.',403);
  const [buyer,seller,quota]=await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM fantasy_roster WHERE league_id=? AND uid=?').bind(league.id,uid).first(),
    db.prepare('SELECT COUNT(*) AS n FROM fantasy_roster WHERE league_id=? AND uid=?').bind(league.id,quote.own.uid).first(),
    db.prepare('SELECT COUNT(*) AS n FROM fantasy_trades WHERE league_id=? AND buyer_uid=? AND week_key=?').bind(league.id,uid,policy.weekKey(nowAccepted)).first()
  ]);
  const reason=clauses.canPayClause({
    enabled:true,acquiredRound:quote.acquiredRound,currentRound:quote.currentRound,now:nowAccepted,
    buyerCount:buyer.n,sellerCount:seller.n,
    transfersRemaining:league.settings.transfers-quota.n,balanceCents:funds.balanceCents,
    reservedCents:funds.reservedCents,priceCents:quote.amountCents,
    closesAt:policy.deadline(policy.weekKey(nowAccepted))
  });
  if(reason)throw fail(reason);
  if(!Number.isSafeInteger(value.expectedCents)||value.expectedCents!==quote.amountCents)
    throw fail('La cláusula ha cambiado. Actualiza el importe antes de confirmar.');
  const id=crypto.randomUUID(),offerId=crypto.randomUUID(),tradeId=crypto.randomUUID();
  try{
    await db.batch([
      db.prepare('INSERT INTO fantasy_clause_purchases(id,league_id,buyer_uid,request_id,seller_uid,ownership_id,player_id,amount_cents,minimum_cents,created_at,acquired_round,current_round,offer_id,trade_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,league.id,uid,value.requestId,quote.own.uid,quote.own.id,quote.player.id,quote.amountCents,quote.baseCents,nowAccepted,quote.acquiredRound,quote.currentRound,offerId,tradeId),
      db.prepare('INSERT INTO fantasy_offers(id,league_id,buyer_uid,seller_uid,ownership_id,player_id,amount_units,request_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(offerId,league.id,uid,quote.own.uid,quote.own.id,quote.player.id,quote.amountCents/50,'!clause-'+id,nowAccepted,nowAccepted+604800000),
      db.prepare('INSERT INTO fantasy_trades(id,league_id,buyer_uid,seller_uid,ownership_id,player_id,amount_units,request_id,offer_id,listing_id,market_day,week_key,budget_units,price_revision,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(tradeId,league.id,uid,quote.own.uid,quote.own.id,quote.player.id,quote.amountCents/50,'clause-'+id,offerId,null,policy.madridDay(nowAccepted),policy.weekKey(nowAccepted),funds.grossCents/50,quote.player.priceRevision||0,nowAccepted)
    ]);
  }catch(e){
    const seen=await db.prepare('SELECT * FROM fantasy_clause_purchases WHERE league_id=? AND buyer_uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
    if(seen&&seen.ownership_id===value.ownershipId)return {saved:true,id:seen.id,amountCents:seen.amount_cents};
    if(/FANTASY_ROSTER_MAX|FANTASY_ROSTER_MIN/.test(e.message))throw fail('La plantilla no permite este traspaso: mínimo 12 y máximo 16.');
    if(/FANTASY_FUNDS/.test(e.message))throw fail('Saldo insuficiente teniendo en cuenta las pujas reservadas.');
    if(/FANTASY_TRANSFERS/.test(e.message))throw fail('Has agotado los fichajes de esta semana.');
    throw fail('La cláusula ya no está disponible. Actualiza el jugador antes de reintentar.');
  }
  return {saved:true,id,amountCents:quote.amountCents,playerId:quote.player.id};
}
