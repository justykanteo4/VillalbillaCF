import catalog from './fantasy-players.json' with {type:'json'};
const playerNames=new Map(catalog.teams.flatMap(team=>team.players.map(player=>[player.id,player.name])));
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(value);
const validRequest=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(value);
function normalizeError(e){
 const errors={FANTASY_EXCHANGE_CHANGED:'Uno de los jugadores ha cambiado de propietario. Actualiza las plantillas.',FANTASY_EXCHANGE_EXPIRED:'El intercambio ya no está pendiente o ha caducado.',FANTASY_EXCHANGE_LISTED:'Uno de los jugadores está anunciado en el mercado. Cancela primero el anuncio.',FANTASY_EXCHANGE_MANAGER:'Ambos participantes deben tener una plantilla activa.',FANTASY_LOAN_PLAYER_LOCKED:'Uno de los jugadores está cedido en préstamo y no puede intercambiarse hasta su devolución.',FANTASY_LOAN_RESERVED_SLOT:'El equipo necesita conservar una plaza para recuperar jugadores prestados.',FANTASY_LOAN_BORROWER_MIN:'El equipo debe conservar una plantilla válida para devolver jugadores prestados.',FANTASY_ROSTER_MIN:'El intercambio dejaría una plantilla con menos de 12 jugadores.',FANTASY_ROSTER_MAX:'El intercambio superaría el máximo de 16 jugadores.',FANTASY_LEAGUE_INACTIVE:'La liga está pausada o archivada.'};
 for(const [key,message] of Object.entries(errors))if(String(e?.message||'').includes(key))return fail(message,409);
 return e;
}
export async function exchangeRoute({db,league,uid,now,method,action='',readBody,canPlay=async()=>true}){
 try{
  if(method==='GET'&&!action){
   const {results}=await db.prepare(`SELECT e.id,e.proposer_uid,e.receiver_uid,e.proposer_player_id,e.receiver_player_id,e.status,e.created_at,e.expires_at,
     p.nickname AS proposer_name,r.nickname AS receiver_name
     FROM fantasy_player_exchanges e
     JOIN fantasy_members p ON p.league_id=e.league_id AND p.uid=e.proposer_uid
     JOIN fantasy_members r ON r.league_id=e.league_id AND r.uid=e.receiver_uid
     WHERE e.league_id=? AND (e.proposer_uid=? OR e.receiver_uid=?)
     ORDER BY e.created_at DESC LIMIT 100`).bind(league.id,uid,uid).all();
   return {exchanges:results.map(e=>({id:e.id,proposer:e.proposer_name,receiver:e.receiver_name,proposerPlayerId:e.proposer_player_id,receiverPlayerId:e.receiver_player_id,proposerPlayerName:playerNames.get(e.proposer_player_id)||'Jugador',receiverPlayerName:playerNames.get(e.receiver_player_id)||'Jugador',incoming:e.receiver_uid===uid,status:e.status==='pending'&&e.expires_at<=now?'expired':e.status,expiresAt:e.expires_at}))};
  }
  if(method!=='POST')throw fail('Método no permitido.',405);
  const value=await readBody();
  if(!value||typeof value!=='object'||Array.isArray(value))throw fail('Solicitud no válida.');
  if(!action){
   if(!validId(value.myOwnershipId)||!validId(value.rivalOwnershipId)||!validRequest(value.requestId))throw fail('Selecciona dos jugadores válidos.');
   const prior=await db.prepare('SELECT id,proposer_ownership_id,receiver_ownership_id FROM fantasy_player_exchanges WHERE league_id=? AND proposer_uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
   if(prior){if(prior.proposer_ownership_id!==value.myOwnershipId||prior.receiver_ownership_id!==value.rivalOwnershipId)throw fail('Solicitud ya utilizada con otros jugadores.',409);return {saved:true,id:prior.id}}
   const [mine,theirs]=await Promise.all([
    db.prepare('SELECT * FROM fantasy_roster WHERE league_id=? AND uid=? AND id=?').bind(league.id,uid,value.myOwnershipId).first(),
    db.prepare('SELECT * FROM fantasy_roster WHERE league_id=? AND id=? AND uid<>?').bind(league.id,value.rivalOwnershipId,uid).first()
   ]);
   if(!mine||!theirs)throw fail('Uno de los jugadores ya no está disponible para intercambiar.',409);
   if(!await canPlay(theirs.uid))throw fail('El rival ya no pertenece a esta liga.',403);
   const listed=await db.prepare('SELECT 1 FROM fantasy_market_listings WHERE league_id=? AND retired_day IS NULL AND player_id IN(?,?)').bind(league.id,mine.player_id,theirs.player_id).first();
   if(listed)throw fail('Primero retira del mercado a los jugadores anunciados.',409);
   const id=crypto.randomUUID();
   await db.prepare(`INSERT INTO fantasy_player_exchanges(id,league_id,proposer_uid,receiver_uid,proposer_ownership_id,receiver_ownership_id,proposer_player_id,receiver_player_id,request_id,created_at,expires_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(league_id,proposer_uid,request_id) DO NOTHING`).bind(id,league.id,uid,theirs.uid,mine.id,theirs.id,mine.player_id,theirs.player_id,value.requestId,now,now+7*86400000).run();
   const saved=await db.prepare('SELECT id,proposer_ownership_id,receiver_ownership_id FROM fantasy_player_exchanges WHERE league_id=? AND proposer_uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
   if(!saved||saved.proposer_ownership_id!==mine.id||saved.receiver_ownership_id!==theirs.id)throw fail('El intercambio se modificó desde otro dispositivo.',409);
   return {saved:true,id:saved.id};
  }
  const match=action.match(/^([A-Za-z0-9-]{1,80})\/(accept|reject|cancel)$/);
  if(!match)throw fail('Operación desconocida.',404);
  const offer=await db.prepare('SELECT * FROM fantasy_player_exchanges WHERE id=? AND league_id=?').bind(match[1],league.id).first();
  if(!offer||(match[2]==='cancel'?offer.proposer_uid:offer.receiver_uid)!==uid)throw fail('Intercambio no encontrado.',404);
  if(match[2]==='accept'&&!await canPlay(offer.proposer_uid))throw fail('El otro participante ya no tiene acceso a esta liga.',403);
  if(offer.status===({'accept':'accepted',reject:'rejected',cancel:'cancelled'}[match[2]]))return {saved:true};
  if(offer.status!=='pending'||offer.expires_at<=now)throw fail('El intercambio ya no está pendiente.',409);
  const next={accept:'accepted',reject:'rejected',cancel:'cancelled'}[match[2]];
  const done=await db.prepare(`UPDATE fantasy_player_exchanges SET status=?,completed_at=?
    WHERE id=? AND league_id=? AND status='pending' AND expires_at>? AND
    ${match[2]==='cancel'?'proposer_uid':'receiver_uid'}=?`).bind(next,now,offer.id,league.id,now,uid).run();
  if(!done.meta?.changes)throw fail('El intercambio ha cambiado. Actualiza la lista.',409);
  return {saved:true};
 }catch(e){throw normalizeError(e)}
}
