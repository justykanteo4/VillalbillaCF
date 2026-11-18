import catalog from './fantasy-players.json' with {type:'json'};
import policy from './fantasy-loan-policy.cjs';
const names=new Map(catalog.teams.flatMap(team=>team.players.map(player=>[player.id,player.name])));
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const id=value=>typeof value==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(value);
const key=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(value);
const DURATION=604800000,PROPOSAL_TTL=7*86400000;
function display(row,uid,now){
 return {id:row.id,playerId:row.player_id,playerName:names.get(row.player_id)||'Jugador',
  lender:row.lender_name,borrower:row.borrower_name,incoming:row.borrower_uid===uid,
  durationWeeks:row.duration_weeks,status:row.status==='pending'&&row.created_at+PROPOSAL_TTL<=now?'expired':row.status,
  startsAt:row.starts_at,endsAt:row.ends_at};
}
function normalError(e){
 const errors={FANTASY_LOAN_CHANGED:'La plantilla ha cambiado. Actualiza y vuelve a intentarlo.',
  FANTASY_LOAN_MANAGER:'El otro equipo no tiene una plantilla activa.',
  FANTASY_LOAN_LISTED:'El jugador está anunciado en el mercado.',
  FANTASY_LOAN_RESERVED_SLOT:'Debes reservar una plaza para devolver jugadores prestados.',
  FANTASY_LOAN_PLAYER_LOCKED:'Un jugador prestado no se puede vender ni traspasar.',
  FANTASY_LOAN_BORROWER_MIN:'No puedes vender jugadores porque debes conservar una plantilla válida al devolver los préstamos.',
  FANTASY_ROSTER_MIN:'Tu plantilla necesita un mínimo de 12 jugadores.',
  FANTASY_ROSTER_MAX:'No quedan plazas disponibles en la plantilla.',
  FANTASY_LEAGUE_INACTIVE:'La liga está pausada o archivada.'};
 for(const [name,text]of Object.entries(errors))if(String(e?.message||'').includes(name))return fail(text,409);
 return e;
}
export async function settleExpiredLoans(db,now=Date.now(),{limit=10}={}){
 const expired=await db.prepare("SELECT id FROM fantasy_player_loans WHERE status='pending' AND created_at<=? LIMIT ?").bind(now-PROPOSAL_TTL,limit).all();
 for(const row of expired.results)await db.prepare("UPDATE fantasy_player_loans SET status='expired' WHERE id=? AND status='pending' AND created_at<=?").bind(row.id,now-PROPOSAL_TTL).run();
 const due=await db.prepare("SELECT id FROM fantasy_player_loans WHERE status='active' AND ends_at<=? ORDER BY ends_at,id LIMIT ?").bind(now,limit).all();
 let returned=0,blocked=0;
 for(const row of due.results){
  try{
   const done=await db.prepare("UPDATE fantasy_player_loans SET status='returned',completed_at=? WHERE id=? AND status='active' AND ends_at<=?").bind(now,row.id,now).run();
   returned+=done.meta?.changes||0;
  }catch{blocked++} // Conserva el contrato activo para reintentar, sin perder la propiedad.
 }
 return {returned,blocked};
}
export async function loanRoute({db,league,uid,method,action='',readBody,now,canPlay=async()=>true}){
 try{
  if(method==='GET'&&!action){
   const all=await db.prepare(`SELECT l.*,a.nickname lender_name,b.nickname borrower_name
    FROM fantasy_player_loans l
    JOIN fantasy_members a ON a.league_id=l.league_id AND a.uid=l.lender_uid
    JOIN fantasy_members b ON b.league_id=l.league_id AND b.uid=l.borrower_uid
    WHERE l.league_id=? AND (l.lender_uid=? OR l.borrower_uid=?) ORDER BY l.created_at DESC LIMIT 100`).bind(league.id,uid,uid).all();
   return {loans:all.results.map(v=>display(v,uid,now))};
  }
  if(method!=='POST')throw fail('Método no permitido.',405);
  const value=await readBody();
  if(!value||typeof value!=='object'||Array.isArray(value))throw fail('Solicitud no válida.');
  if(!action){
   if(!id(value.ownershipId)||!id(value.borrowerUid)||!key(value.requestId)||!Number.isInteger(value.weeks))throw fail('Selecciona jugador, equipo y duración.');
   const old=await db.prepare('SELECT * FROM fantasy_player_loans WHERE league_id=? AND lender_uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
   if(old){if(old.ownership_id!==value.ownershipId||old.borrower_uid!==value.borrowerUid||old.duration_weeks!==value.weeks)throw fail('Esta solicitud ya corresponde a otro préstamo.',409);return {saved:true,id:old.id}}
   const [owned,borrower,counts]=await Promise.all([
    db.prepare('SELECT * FROM fantasy_roster WHERE league_id=? AND uid=? AND id=?').bind(league.id,uid,value.ownershipId).first(),
    db.prepare('SELECT 1 FROM fantasy_managers WHERE league_id=? AND uid=?').bind(league.id,value.borrowerUid).first(),
    db.prepare('SELECT uid,COUNT(*) AS n FROM fantasy_roster WHERE league_id=? AND uid IN (?,?) GROUP BY uid').bind(league.id,uid,value.borrowerUid).all()
   ]);
   if(!owned||!borrower||!await canPlay(value.borrowerUid))throw fail('El jugador o el rival ya no están disponibles.',409);
   const count=new Map(counts.results.map(r=>[r.uid,r.n]));
   policy.validateLoanProposal({lenderUid:uid,borrowerUid:value.borrowerUid,lenderCount:count.get(uid)||0,borrowerCount:count.get(value.borrowerUid)||0,weeks:value.weeks,startsAt:now,endsAt:now+value.weeks*DURATION});
   const proposal=crypto.randomUUID();
   await db.prepare(`INSERT INTO fantasy_player_loans
     (id,league_id,lender_uid,borrower_uid,ownership_id,player_id,duration_weeks,status,request_id,created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(league_id,lender_uid,request_id) DO NOTHING`)
    .bind(proposal,league.id,uid,value.borrowerUid,owned.id,owned.player_id,value.weeks,'pending',value.requestId,now).run();
   const saved=await db.prepare('SELECT * FROM fantasy_player_loans WHERE league_id=? AND lender_uid=? AND request_id=?').bind(league.id,uid,value.requestId).first();
   if(!saved||saved.ownership_id!==owned.id||saved.borrower_uid!==value.borrowerUid||saved.duration_weeks!==value.weeks)throw fail('La propuesta ha cambiado desde otro dispositivo.',409);
   return {saved:true,id:saved.id};
  }
  const match=action.match(/^([A-Za-z0-9-]{1,80})\/(accept|reject|cancel)$/);
  if(!match)throw fail('Operación no disponible.',404);
  const loan=await db.prepare('SELECT * FROM fantasy_player_loans WHERE league_id=? AND id=?').bind(league.id,match[1]).first();
  if(!loan||(match[2]==='cancel'?loan.lender_uid:loan.borrower_uid)!==uid)throw fail('Préstamo no encontrado.',404);
  const status={accept:'active',reject:'rejected',cancel:'cancelled'}[match[2]];
  if(loan.status===status)return {saved:true};
  if(loan.status!=='pending'||loan.created_at+PROPOSAL_TTL<=now)throw fail('La propuesta no está pendiente o ha caducado.',409);
  if(match[2]==='accept'){
   if(!await canPlay(loan.lender_uid))throw fail('El equipo propietario ha perdido el acceso.',403);
   const done=await db.prepare(`UPDATE fantasy_player_loans
     SET status='active',starts_at=?,ends_at=?
     WHERE id=? AND league_id=? AND borrower_uid=? AND status='pending' AND created_at>?`)
    .bind(now,now+loan.duration_weeks*DURATION,loan.id,league.id,uid,now-PROPOSAL_TTL).run();
   if(!done.meta?.changes)throw fail('Préstamo ya cambiado. Actualiza.',409);
  }else{
   const done=await db.prepare("UPDATE fantasy_player_loans SET status=? WHERE id=? AND league_id=? AND status='pending' AND created_at>?").bind(status,loan.id,league.id,now-PROPOSAL_TTL).run();
   if(!done.meta?.changes)throw fail('Préstamo ya cambiado. Actualiza.',409);
  }
  return {saved:true};
 }catch(e){throw normalError(e)}
}
