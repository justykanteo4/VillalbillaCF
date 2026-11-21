// Scoped MVP editing for approved club coaches/editors without Fantasy admin access.
import {authorizeClubResultEditor} from './club-result-authorization.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import {adminGame} from './fantasy-game.mjs';
import {settleAwardEconomy} from './fantasy-award-settlement.mjs';
import teams from './teams.json' with {type:'json'};

const fail=(message,status=400)=>Object.assign(Error(message),{status});
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
// Additive D1 schema: created before the first non-admin MVP change, with no reset
// or alteration of existing Fantasy leagues, awards, wallets or participants.
export const mvpAuditTable="CREATE TABLE IF NOT EXISTS club_mvp_audit(id TEXT PRIMARY KEY,match_id TEXT NOT NULL,team_id TEXT NOT NULL,previous_revision INTEGER NOT NULL,new_revision INTEGER NOT NULL,previous_player_ids TEXT NOT NULL,player_ids TEXT NOT NULL,actor_uid TEXT NOT NULL,actor_name TEXT NOT NULL,actor_role TEXT NOT NULL CHECK(actor_role IN ('admin','editor','trainer')),created_at INTEGER NOT NULL,UNIQUE(match_id,team_id,new_revision))";
const validScope=(teamId,matchId)=>teams.some(t=>t.id===teamId)&&/^[0-9]{1,20}$/.test(matchId||'');

export async function handleClubMvp(request,env,{authorize=authorizeClubResultEditor,authorizeAdmin=verifyAdmin,game=adminGame,settle=settleAwardEconomy,clock=Date.now,ctx}={}){
 const url=new URL(request.url),path=url.pathname;
 if(path!=='/api/club/mvp'&&path!=='/api/admin/club-mvp-audit')return null;
 try{
  if(path==='/api/admin/club-mvp-audit'){
   if(request.method!=='GET')throw fail('Método no permitido.',405);
   await authorizeAdmin(request,env);
   const db=env.CHAT_DB;if(!db)throw fail('Historial no disponible.',503);
   const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='club_mvp_audit'").first();
   const history=exists?(await db.prepare('SELECT * FROM club_mvp_audit ORDER BY new_revision DESC, created_at DESC LIMIT 100').all()).results:[];
   return reply({history,limit:100});
  }
  if(request.method!=='GET'&&request.method!=='POST')throw fail('Método no permitido.',405);
  let value;
  if(request.method==='POST'){
   const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw fail('Origen no permitido.',403);
   const raw=await request.text();if(raw.length>10000)throw fail('Solicitud demasiado grande.',413);
   try{value=JSON.parse(raw)}catch{throw fail('Datos no válidos.')}
  }else value={teamId:url.searchParams.get('team'),matchId:url.searchParams.get('match')};
  const {teamId,matchId}=value||{};
  if(!validScope(teamId,matchId))throw fail('Partido no válido.');
  if(request.method==='POST'){
   const {kind,revision,playerIds}=value;
   if(kind!=='mvp'||!Number.isSafeInteger(revision)||revision<0||!Array.isArray(playerIds)||(playerIds.length>2)||new Set(playerIds).size!==playerIds.length)
    throw fail('Selecciona uno o dos MVP, o ninguno para retirar los premios.');
  }
  // This authorization reads the approved role and assigned teams from Firestore,
  // never from data supplied in the request body.
  const actor=await authorize(request,env,teamId,{capability:'mvp'});
  if(!actor||typeof actor.uid!=='string'||!actor.uid||!['admin','editor','trainer'].includes(actor.role))
   throw fail('No se pudo verificar quién realiza la corrección.',403);
  const db=env.CHAT_DB;if(!db)throw fail('Premios no disponibles.',503);
  if(request.method==='POST')await db.prepare(mvpAuditTable).run();
  const result=await game({db,path:'/api/fantasy/admin/awards',method:request.method,
   readBody:async()=>value,matchScope:{teamId,matchId},...(request.method==='POST'?{actor}: {})});
  if(request.method==='POST'){
   await db.prepare('UPDATE fantasy_prize_state SET next_at=0,fingerprint=NULL').run();
   await db.prepare('UPDATE fantasy_ideal_reward_state SET next_at=0,fingerprint=NULL').run();
   ctx?.waitUntil?.(settle(env,clock()));
  }
  return reply(result);
 }catch(error){return reply({error:error.status?error.message:'No se pudo guardar o consultar los MVP.'},error.status||503)}
}
