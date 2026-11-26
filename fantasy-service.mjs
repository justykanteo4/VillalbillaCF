import {paymentAdmin} from './fantasy-payment-admin.mjs';
import {roundPlayerBreakdown} from './fantasy-round-player-breakdown.mjs';
import {listSeasonArchives,archiveFantasySeason} from './fantasy-seasons.mjs';
import {loanRoute} from './fantasy-loans.mjs';
import {exchangeRoute} from './fantasy-exchanges.mjs';
import identity from './fantasy-team-identity.cjs';
import {transferFantasyPlayer} from './fantasy-admin-transfer.mjs';
import {inbox} from './fantasy-inbox.mjs';
import {requestReadCache} from './d1-read-cache.mjs';
import {settleWeeklyPrizes} from './fantasy-weekly-prizes.mjs';
import {settleAwardEconomy} from './fantasy-award-settlement.mjs';
import {settleIdealCash} from './fantasy-ideal-cash.mjs';
import {dispatchOfferNotifications} from './fantasy-offer-notifications.mjs';
import {playerOwnership} from './fantasy-player-ownership.mjs';
import {weeklyEleven} from './fantasy-weekly-eleven.mjs';
import {pendingPrize,acknowledgePrize} from './fantasy-prize-receipts.mjs';
import {applyFantasyPositions} from './fantasy-player-positions.mjs';
import {pendingPurchase,acknowledgePurchase} from './fantasy-purchase-receipts.mjs';
import {marketHistory} from './fantasy-market-history.mjs';
import {saleRoute} from './fantasy-sales.mjs';
import {clauseRoute} from './fantasy-clause-routes.mjs';
import {managerListingRoute,gameOfferForListing} from './fantasy-manager-listings.mjs';
import {reservedBids} from './fantasy-auctions.mjs';
import {economyPolicy} from './fantasy-economy.mjs';
import {gameRoute,adminGame,settleSalaries,ensureManager,playerTotals,sports} from './fantasy-game.mjs';
import {decodeJwt} from 'jose';
import verification from './account-verification.cjs';
import {verifyAccessUser} from './access-service.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import {resetLeague} from './fantasy-league-reset.mjs';
import {scheduleVoteCleanup} from './vote-cleanup.mjs';
import {fantasyTeamIds} from './fantasy-teams.mjs';
import config from './fantasy-config.cjs';
import {marketRoute} from './fantasy-market.mjs';
import leaguePolicy from './fantasy-leagues.cjs';
import marketWindowPolicy from './fantasy-market-window-policy.cjs';
import teams from './teams.json' with {type:'json'};
import catalog from './fantasy-players.json' with {type:'json'};
import statCorrections from './fantasy-stat-corrections.cjs';
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}}),fail=(message,status=400)=>Object.assign(Error(message),{status});
async function verifyFantasyUser(request){const uid=await verifyAccessUser(request);if(!verification.verifiedClaims(decodeJwt(request.headers.get('Authorization').slice(7))))throw fail('Verifica tu cuenta para jugar en Fantasy.',403);return uid}
function randomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>alphabet[n%32]).join('')}
async function body(request,maxLength=6000){const text=await request.text();if(text.length>maxLength)throw fail('Solicitud demasiado grande.',413);try{return JSON.parse(text)}catch{throw fail('Datos no válidos.')}}
function publicLeague(row,uid,now,economy){const stored=JSON.parse(row.settings_json),settings={...stored,...(row.mode==='classic'?{budget:52}:{}),weeklyIncome:(economy?.weeklyIncomeCents??200)/100,...(economy?{weeklyChange:economy}:{})};const finance=leaguePolicy.weeklyBudget(settings,row.joinedAt,now);finance.tradingDelta=(row.delta_cents||0)/100;finance.cashBalance=Math.round((finance.balance+finance.tradingDelta)*100)/100;finance.reservedBids=(row.reserved_cents||0)/100;finance.balance=Math.round((finance.cashBalance-finance.reservedBids)*100)/100;return {id:row.id,name:row.mode==='classic'?leaguePolicy.classicLeagueName(teams.find(t=>t.id===row.group_team_id)):row.name,mode:row.mode,pool:{type:'club'},teamId:row.group_team_id,teamName:row.group_team_id==='private-invitation'?'Liga privada':leaguePolicy.classicLeagueName(teams.find(t=>t.id===row.group_team_id)).replace('Liga de ',''),privateLeague:row.group_team_id==='private-invitation',settings,finance,code:row.code,createdAt:row.created_at,isOwner:row.owner_uid===uid,memberCount:row.memberCount||0}}
async function detail(db,id,uid,now,allowed){const row=await db.prepare('SELECT l.*,COALESCE(v.delta_cents,ROUND(w.delta_units*50),0) AS delta_cents,COALESCE(g.team_id,json_extract(l.pool_json,\'$.teamId\')) AS group_team_id,m.joined_at AS joinedAt FROM fantasy_leagues l JOIN fantasy_members m ON m.league_id=l.id LEFT JOIN fantasy_wallets w ON w.league_id=l.id AND w.uid=m.uid LEFT JOIN fantasy_wallet_cents v ON v.league_id=l.id AND v.uid=m.uid LEFT JOIN fantasy_league_groups g ON g.league_id=l.id WHERE l.id=? AND m.uid=?').bind(id,uid).first();if(!row)throw fail('Liga no encontrada o no perteneces a ella.',404);if(!allowed.includes(row.group_team_id))throw fail('Esta liga está reservada a compañeros del mismo equipo aprobado.',403);const lifecycle=await db.prepare('SELECT state FROM fantasy_league_lifecycle WHERE league_id=?').bind(id).first();if(!lifecycle||lifecycle.state==='active'){await settleSalaries(db,id,now);await settleIdealCash(db,id,now);const prizeState=await db.prepare('SELECT next_at FROM fantasy_prize_state WHERE league_id=?').bind(id).first();if(!prizeState||prizeState.next_at<=now)await settleWeeklyPrizes(db,id,now);}const [wallet,held,members,economy]=await Promise.all([db.prepare('SELECT delta_cents FROM fantasy_wallet_cents WHERE league_id=? AND uid=?').bind(id,uid).first(),reservedBids(db,id,uid),db.prepare('SELECT nickname,joined_at AS joinedAt,CASE WHEN uid=? THEN 1 ELSE 0 END AS me,CASE WHEN uid=? THEN 1 ELSE 0 END AS creator FROM fantasy_members WHERE league_id=? ORDER BY joined_at,nickname').bind(uid,row.owner_uid,id).all(),economyPolicy(db)]);row.delta_cents=wallet?.delta_cents||0;row.reserved_cents=held;return {league:{...publicLeague(row,uid,now,economy),memberCount:members.results.length,lifecycleState:lifecycle?.state||'active'},members:members.results.map(m=>({...m,me:!!m.me,creator:!!m.creator}))}}
// Only club sporting data and pricing inputs, never ownership, balances, tokens or member records.
// Reuse computed values only when every scoring input matches; live reads remain authoritative.
const pricedSnapshots=new Map();
async function prices(db,pool,points=leaguePolicy.classicSettings.points,snapshot=null){const [rows,totals,live,awards,positions]=await Promise.all([db.prepare('SELECT player_id,price_cents,revision,updated_at FROM fantasy_player_cents').all(),db.prepare("SELECT candidate_id,SUM(points_total) AS points FROM social_candidate_totals WHERE season='2026-27' AND category IN('player','goalkeeper') GROUP BY candidate_id").all(),sports(db),db.prepare('SELECT * FROM fantasy_awards').all(),db.prepare('SELECT player_id,position FROM fantasy_player_positions').all()]);if(snapshot){snapshot.live=live;snapshot.awards=awards.results}const key=JSON.stringify([pool,points,rows.results,totals.results,live.matches,awards.results,positions.results]);if(pricedSnapshots.has(key))return structuredClone(pricedSnapshots.get(key));const overrides=new Map(rows.results.map(r=>[r.player_id,r])),votes=Object.fromEntries(totals.results.map(r=>[r.candidate_id,r.points])),byTeamPlayer=new Map();for(const m of live.matches)for(const p of m.players){const key=m.teamId+':'+p.id,row=byTeamPlayer.get(key)||{goals:0,wins:0,played:0,cleanSheets:0,red:0,yellow:0,partial:false};row.goals+=p.goals||0;row.wins+=p.played&&p.win?1:0;row.played+=p.played||0;row.cleanSheets+=p.cleanSheet?1:0;row.red+=p.red||0;row.yellow+=p.yellow||0;row.partial||=!!p.partial;byTeamPlayer.set(key,row)}const current={...catalog,teams:catalog.teams.map(t=>({...t,players:t.players.map(p=>{const row=byTeamPlayer.get(t.id+':'+p.id);return row?{...p,...row,partial:p.partial||row.partial}:p})}))};const priced=leaguePolicy.playersForPool(current,{type:'club'},votes).filter(p=>!pool||pool.type==='club'||p.teams.some(t=>t.id===pool.teamId)).map(p=>{const edit=overrides.get(p.id);return {...p,automaticPrice:p.price,price:edit?.price_cents!=null?edit.price_cents/100:p.price,manualPrice:edit?.price_cents!=null,priceRevision:edit?.revision||0,priceUpdatedAt:edit?.updated_at||null}}).sort((a,b)=>b.price-a.price||b.performance-a.performance||a.name.localeCompare(b.name,'es'));const positionMap=new Map(positions.results.map(r=>[r.player_id,r.position])),result=playerTotals(priced.map(p=>positionMap.get(p.id)?{...p,position:positionMap.get(p.id),manualPosition:true}:p),live,points,awards.results);if(pricedSnapshots.size>=3)pricedSnapshots.delete(pricedSnapshots.keys().next().value);pricedSnapshots.set(key,structuredClone(result));return result}

async function manageFantasyUsers(db,request,url,adminUid,now){
 if(!db)throw fail('No se pudo conectar con Fantasy.',503);
 if(request.method==='GET'){
  const query=(url.searchParams.get('q')||'').trim().slice(0,80);
  const after=(url.searchParams.get('after')||'').slice(0,128);
  const {results}=await db.prepare(`
   WITH users AS (
    SELECT uid FROM fantasy_members UNION SELECT uid FROM fantasy_excluded_users
    UNION SELECT uid FROM fantasy_participant_teams
   )
   SELECT u.uid,COALESCE(MIN(m.nickname),u.uid) AS nickname,COUNT(m.uid) AS leagues,
          x.excluded_at AS excludedAt
   FROM users u
   LEFT JOIN fantasy_members m ON m.uid=u.uid
   LEFT JOIN fantasy_excluded_users x ON x.uid=u.uid
   WHERE u.uid>? AND u.uid<>?
   GROUP BY u.uid
   HAVING ?='' OR MAX(INSTR(LOWER(m.nickname),LOWER(?)))>0 OR INSTR(u.uid,?)>0
   ORDER BY u.uid LIMIT 31
  `).bind(after,adminUid,query,query,query).all();
  const users=results.slice(0,30);
  return reply({users,next:results.length>30?users[users.length-1].uid:null});
 }
 if(request.method!=='POST')throw fail('Método no permitido.',405);
 const value=await body(request),target=value?.uid;
 if(typeof target!=='string'||!target.trim()||target.length>128||typeof value.excluded!=='boolean')throw fail('Usuario o acción no válidos.');
 if(target===adminUid)throw fail('No puedes cambiar tu propio acceso desde aquí.');
 if(!await db.prepare('SELECT 1 FROM fantasy_members WHERE uid=? UNION SELECT 1 FROM fantasy_excluded_users WHERE uid=? UNION SELECT 1 FROM fantasy_participant_teams WHERE uid=? LIMIT 1').bind(target,target,target).first())throw fail('No se encontró al usuario en Fantasy.',404);
 if(value.excluded){
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO fantasy_excluded_users(uid,excluded_at,excluded_by) VALUES(?,?,?)').bind(target,now,adminUid),
   db.prepare('DELETE FROM fantasy_participant_teams WHERE uid=?').bind(target),
  ]);
 }else{
  await db.prepare('DELETE FROM fantasy_excluded_users WHERE uid=?').bind(target).run();
 }
 return reply({uid:target,excluded:value.excluded});
}

export async function handleFantasy(request,env,{authorize=verifyFantasyUser,adminAuthorize=verifyAdmin,makeCode=randomCode,clock=Date.now,getTeams=fantasyTeamIds,ctx}={}){
 const url=new URL(request.url),path=url.pathname;if(path!=='/api/fantasy'&&!path.startsWith('/api/fantasy/'))return null;
 try{const uid=await authorize(request,env),currentTime=clock();if(request.method!=='GET'){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw fail('Origen no permitido.',403)}
 let admin=false;try{admin=(await adminAuthorize(request,env))===uid}catch(e){if(e.status!==401&&e.status!==403)throw e}
 const db=requestReadCache(env.CHAT_DB);let allowed;
 const access=db?await db.prepare('SELECT disabled,revision,updated_at FROM fantasy_access_settings WHERE id=1').first():null;
 const accessSettings={disabled:access?!!access.disabled:true,revision:access?.revision||0,updatedAt:access?.updated_at||null};
 if(path.startsWith('/api/fantasy/admin/')&&!admin)throw fail('Acceso reservado a administradores.',403);
 if(path==='/api/fantasy/admin/payments')return reply(await paymentAdmin(env.CHAT_DB,request.method,()=>body(request),url,currentTime));
 if(path==='/api/fantasy/admin/league-creation'){
  if(!db)throw fail('No se pudo consultar la creación de ligas.',503);
  if(request.method==='GET'){
   const setting=await db.prepare('SELECT enabled,revision,updated_at FROM fantasy_league_creation_settings WHERE id=1').first();
   return reply({enabled:setting?.enabled===1,revision:setting?.revision||0,updatedAt:setting?.updated_at||0});
  }
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  if(typeof value?.enabled!=='boolean'||!Number.isSafeInteger(value.revision)||value.revision<0)throw fail('Actualiza el ajuste antes de guardarlo.');
  const changed=await db.prepare('UPDATE fantasy_league_creation_settings SET enabled=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=? RETURNING enabled,revision,updated_at').bind(value.enabled?1:0,currentTime,value.revision).first();
  if(!changed)throw fail('Otro administrador ha cambiado este ajuste. Actualiza antes de guardar.',409);
  return reply({enabled:changed.enabled===1,revision:changed.revision,updatedAt:changed.updated_at});
 }
 if(path==='/api/fantasy/admin/points/history'){
  if(!db)throw fail('Historial de puntos no disponible.',503);
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const history=(await db.prepare('SELECT revision,actor_uid AS actor,before_json AS beforeJson,after_json AS afterJson,created_at AS createdAt FROM fantasy_point_history ORDER BY revision DESC LIMIT 50').all()).results;
  return reply({history:history.map(item=>({revision:item.revision,actor:item.actor,before:JSON.parse(item.beforeJson),after:JSON.parse(item.afterJson),createdAt:item.createdAt}))});
 }
 if(path==='/api/fantasy/admin/points'){
  if(!db)throw fail('No se pudo consultar la puntuación.',503);
  const current=await db.prepare('SELECT points_json,revision,updated_at FROM fantasy_point_settings WHERE id=1').first();
  if(!current)throw fail('Falta la configuración de puntuaciones.',503);
  if(request.method==='GET')return reply({points:JSON.parse(current.points_json),revision:current.revision,updatedAt:current.updated_at});
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request),input=value?.points;
  const editable=['win','draw','loss','goal','cleanSheet','mvp','yellow','secondYellow','red','ownGoal','captain'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==editable.length||!editable.every(k=>Object.hasOwn(input,k)&&Number.isInteger(input[k])&&(k==='captain'?input[k]>=1&&input[k]<=5:input[k]>=-20&&input[k]<=20)))throw fail('Introduce puntuaciones enteras entre −20 y 20 y un multiplicador del capitán entre 1 y 5.');
  if(!Number.isSafeInteger(value?.revision)||value.revision<0)throw fail('Actualiza los puntos antes de guardar.');
  if(value.revision!==current.revision)throw fail('Otro administrador ha cambiado los puntos. Actualiza la lista.',409);
  const points={...leaguePolicy.classicSettings.points,...input,idealXI:0},encoded=JSON.stringify(points);
  // Atomic: revision check and all league rule updates are committed together.
  await db.batch([
   db.prepare("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM fantasy_point_settings WHERE id=1 AND revision=?) THEN json('FANTASY_POINTS_CHANGED') ELSE 'ok' END").bind(value.revision),
   db.prepare("UPDATE fantasy_point_settings SET points_json=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?").bind(encoded,currentTime,value.revision),
   db.prepare("UPDATE fantasy_leagues SET settings_json=json_set(settings_json,'$.points',json(?))").bind(encoded),
   db.prepare('INSERT INTO fantasy_point_history(id,revision,actor_uid,before_json,after_json,created_at) VALUES(?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),value.revision+1,uid,current.points_json,encoded,currentTime)
  ]);
  return reply({points,revision:value.revision+1,updatedAt:currentTime});
 }
 if(path==='/api/fantasy/admin/users')return await manageFantasyUsers(db,request,url,uid,currentTime);
 if(db&&!path.startsWith('/api/fantasy/admin/')&&await db.prepare('SELECT 1 FROM fantasy_excluded_users WHERE uid=?').bind(uid).first()){
  if(request.method==='GET'&&['/api/fantasy','/api/fantasy/preview'].includes(path))return reply({rules:config.rules,canPlay:false,isAdmin:admin,excluded:true});
  throw fail('Tu acceso a Fantasy está desactivado.',403);
 }
 if(path==='/api/fantasy/admin/access'){
 if(!db)throw fail('No se pudo consultar el acceso de Fantasy.',503);
 if(request.method==='GET')return reply(accessSettings);
 if(request.method!=='POST')throw fail('Método no permitido.',405);
 const value=await body(request);if(typeof value?.disabled!=='boolean'||!Number.isSafeInteger(value.revision)||value.revision<0)throw fail('Actualiza el ajuste antes de guardarlo.');
 const saved=await db.prepare('UPDATE fantasy_access_settings SET disabled=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=? RETURNING disabled,revision,updated_at').bind(value.disabled?1:0,currentTime,value.revision).first();
 if(!saved)throw fail('Otro administrador ha cambiado el acceso. Actualiza el ajuste antes de guardar.',409);
 return reply({disabled:!!saved.disabled,revision:saved.revision,updatedAt:saved.updated_at});
 }
 if(accessSettings.disabled&&!admin){if(request.method==='GET'&&['/api/fantasy','/api/fantasy/preview'].includes(path))return reply({rules:config.rules,canPlay:false,isAdmin:false,disabled:true,features:{leagues:false,prices:false,market:false,offers:false,play:false}});throw fail('Fantasy está deshabilitado temporalmente. Acceso reservado a administradores.',403)}
 const allowedTeams=async()=>{if(allowed)return allowed;allowed=[...(await getTeams(request,uid,{isAdmin:admin})).filter(id=>teams.some(t=>t.id===id)),'private-invitation'];if(db){const encoded=JSON.stringify(allowed);const stored=(await db.prepare('SELECT team_id FROM fantasy_participant_teams WHERE uid=?').bind(uid).all()).results;const previous=new Set(stored.map(row=>row.team_id));if(previous.size!==allowed.length||allowed.some(id=>!previous.has(id)))await db.batch([db.prepare('DELETE FROM fantasy_participant_teams WHERE uid=? AND (team_id NOT IN (SELECT CAST(value AS TEXT) FROM json_each(?)) OR EXISTS(SELECT 1 FROM fantasy_excluded_users WHERE uid=?))').bind(uid,encoded,uid),db.prepare('INSERT OR IGNORE INTO fantasy_participant_teams SELECT ?,CAST(value AS TEXT),? FROM json_each(?) WHERE NOT EXISTS(SELECT 1 FROM fantasy_excluded_users WHERE uid=?)').bind(uid,currentTime,encoded,uid)]);}return allowed};
 if(request.method==='GET'&&['/api/fantasy','/api/fantasy/preview'].includes(path)){if(admin)await scheduleVoteCleanup(request,env,uid,async()=>uid,ctx);return reply({rules:config.rules,canPlay:(await allowedTeams()).some(id=>id!=='private-invitation'),canJoinPrivate:true,isAdmin:admin,disabled:accessSettings.disabled,features:{leagues:false,prices:true,market:true,offers:true,play:false}})}
 if(!['GET','POST'].includes(request.method))return reply({error:'Método no permitido.'},405);
 if(!db)throw fail('No se pudo conectar con las ligas.',503);
 if(path.startsWith('/api/fantasy/admin/')&&!admin)throw fail('Acceso reservado a administradores.',403);
 const seasonAdminMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/seasons$/);
 if(seasonAdminMatch){
  const leagueId=seasonAdminMatch[1];
  const exists=await db.prepare('SELECT 1 FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!exists)throw fail('Liga no encontrada.',404);
  if(request.method==='GET')return reply(await listSeasonArchives(db,leagueId));
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  return reply(await archiveFantasySeason({db,leagueId,season:value?.season,confirmation:value?.confirmation,actorUid:uid,now:currentTime}));
 }
 const specialRoundsMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/special-rounds$/);
 if(specialRoundsMatch){
  const leagueId=specialRoundsMatch[1];
  const league=await db.prepare('SELECT id,name FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!league)throw fail('Liga no encontrada.',404);
  const [groups,existing,live]=await Promise.all([
   db.prepare('SELECT team_id FROM fantasy_league_groups WHERE league_id=?').bind(leagueId).all(),
   db.prepare('SELECT week,multiplier,revision FROM fantasy_special_rounds WHERE league_id=?').bind(leagueId).all(),
   sports(db)
  ]);
  const allowed=new Set(groups.results.map(g=>String(g.team_id))),configured=new Map(existing.results.map(r=>[r.week,r]));
  const rounds=new Map();
  for(const fixture of live.schedule){
   if(!allowed.has(String(fixture.teamId))||!Number.isSafeInteger(fixture.week)||!Number.isFinite(fixture.startsAt))continue;
   const previous=rounds.get(fixture.week);
   if(!previous||fixture.startsAt<previous.startsAt)
    rounds.set(fixture.week,{week:fixture.week,round:fixture.round||null,startsAt:fixture.startsAt});
  }
  const windows=[...rounds.values()].sort((a,b)=>a.startsAt-b.startsAt).map(row=>{
   const config=configured.get(row.week);
   return {...row,multiplier:config?.multiplier??1,revision:config?.revision??0,
    editable:row.startsAt>currentTime,
    date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.startsAt))};
  });
  if(request.method==='GET')return reply({league,weeks:windows});
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  if(!Number.isSafeInteger(value?.week)||![1,2].includes(value?.multiplier)||!Number.isSafeInteger(value?.revision)||value.revision<0)throw fail('Jornada especial no válida.');
  const round=windows.find(r=>r.week===value.week);
  if(!round)throw fail('La jornada no pertenece a los equipos de esta liga.',404);
  if(!round.editable)throw fail('Solo puedes modificar jornadas antes de que empiece su primer partido.',409);
  if(round.revision!==value.revision)throw fail('La jornada cambió desde otro dispositivo. Actualiza antes de guardar.',409);
  if(round.multiplier===value.multiplier)return reply({...round,saved:true});
  const next=await db.prepare(`INSERT INTO fantasy_special_rounds(league_id,week,multiplier,revision,actor_uid,updated_at) VALUES(?,?,?,1,?,?)
    ON CONFLICT(league_id,week) DO UPDATE SET multiplier=excluded.multiplier,
    revision=fantasy_special_rounds.revision+1,actor_uid=excluded.actor_uid,updated_at=excluded.updated_at
    WHERE fantasy_special_rounds.revision=? RETURNING multiplier,revision`)
    .bind(leagueId,value.week,value.multiplier,uid,currentTime,value.revision).first();
  if(!next)throw fail('La jornada cambió. Actualiza antes de guardar.',409);
  await db.prepare('UPDATE fantasy_prize_state SET next_at=0 WHERE league_id=?').bind(leagueId).run();
  return reply({...round,multiplier:next.multiplier,revision:next.revision,saved:true});
 }
 const marketSlotsMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/market-slots$/);
 if(marketSlotsMatch){
  const leagueId=marketSlotsMatch[1];
  const league=await db.prepare('SELECT id,name FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!league)throw fail('Liga no encontrada.',404);
  const row=await db.prepare('SELECT slots,revision FROM fantasy_market_slot_settings WHERE league_id=?').bind(leagueId).first();
  const current={slots:row?.slots??16,revision:row?.revision??0};
  if(request.method==='GET')return reply({league,...current});
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const data=await body(request);
  if(!Number.isInteger(data?.slots)||data.slots<16||data.slots>24||!Number.isSafeInteger(data?.revision)||data.revision<0)throw fail('Cantidad de mercado no válida: elige entre 16 y 24 jugadores.');
  if(data.revision!==current.revision)throw fail('Otro administrador cambió la cantidad. Actualiza antes de guardar.',409);
  if(data.slots===current.slots)return reply({league,...current,saved:true});
  if(data.slots<current.slots){
   const busy=await db.prepare("SELECT COUNT(*) AS n FROM fantasy_auction_bids b JOIN fantasy_auction_rounds r ON r.league_id=b.league_id AND r.listing_id=b.listing_id AND r.day=b.day WHERE b.league_id=? AND b.status='active' AND r.status='open'").bind(leagueId).first();
   if(busy.n>0)throw fail('No reduzcas las plazas mientras haya pujas activas; espera a que finalicen.',409);
  }
  const updated=await db.prepare(`INSERT INTO fantasy_market_slot_settings(league_id,slots,revision,changed_by,changed_at)
   VALUES(?,?,1,?,?) ON CONFLICT(league_id) DO UPDATE SET slots=excluded.slots,revision=fantasy_market_slot_settings.revision+1,changed_by=excluded.changed_by,changed_at=excluded.changed_at
   WHERE fantasy_market_slot_settings.revision=? RETURNING slots,revision`)
    .bind(leagueId,data.slots,uid,currentTime,data.revision).first();
  if(!updated)throw fail('La cantidad ha cambiado. Actualiza los ajustes.',409);
  return reply({league,...updated,saved:true});
 }
 const marketWindowMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/market-window$/);
 if(marketWindowMatch){
  const leagueId=marketWindowMatch[1];
  const league=await db.prepare('SELECT id,name FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!league)throw fail('Liga no encontrada.',404);
  const old=await db.prepare('SELECT start_day AS startDay,end_day AS endDay,revision FROM fantasy_market_windows WHERE league_id=?').bind(leagueId).first();
  const existing={startDay:old?.startDay??null,endDay:old?.endDay??null,revision:old?.revision??0};
  if(request.method==='GET')return reply({league,...existing,open:marketWindowPolicy.isOpen(existing,currentTime),startDate:marketWindowPolicy.label(existing.startDay),endDate:marketWindowPolicy.label(existing.endDay)});
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  if(!Number.isSafeInteger(value?.revision)||value.revision<0)throw fail('La revisión de mercado no es válida.');
  let startDay,endDay;
  try{startDay=marketWindowPolicy.parseDate(value.startDate);endDay=marketWindowPolicy.parseDate(value.endDate);marketWindowPolicy.validWindow(startDay,endDay)}
  catch(e){throw fail(e.message)}
  if(value.revision!==existing.revision)throw fail('Otro administrador ha cambiado el mercado. Actualiza antes de guardar.',409);
  if(startDay===existing.startDay&&endDay===existing.endDay)return reply({league,...existing,startDate:marketWindowPolicy.label(startDay),endDate:marketWindowPolicy.label(endDay),open:marketWindowPolicy.isOpen(existing,currentTime),saved:true});
  const next=await db.prepare(`INSERT INTO fantasy_market_windows(league_id,start_day,end_day,revision,updated_at,updated_by) VALUES(?,?,?,1,?,?)
    ON CONFLICT(league_id) DO UPDATE SET start_day=excluded.start_day,end_day=excluded.end_day,
    revision=fantasy_market_windows.revision+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by
    WHERE fantasy_market_windows.revision=? RETURNING start_day AS startDay,end_day AS endDay,revision`)
    .bind(leagueId,startDay,endDay,currentTime,uid,value.revision).first();
  if(!next)throw fail('La fecha del mercado ha cambiado. Actualiza antes de guardar.',409);
  return reply({league,...next,startDate:marketWindowPolicy.label(next.startDay),endDate:marketWindowPolicy.label(next.endDay),open:marketWindowPolicy.isOpen(next,currentTime),saved:true});
 }
 const assertMarketOpen=async leagueId=>{
  const window=await db.prepare('SELECT start_day AS startDay,end_day AS endDay FROM fantasy_market_windows WHERE league_id=?').bind(leagueId).first();
  if(!marketWindowPolicy.isOpen(window,currentTime))throw fail('El mercado de esta liga está cerrado. Consulta las fechas en Mercado.',409);
 };
 const playerBlockMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/player-blocks$/);
 if(playerBlockMatch){
  const leagueId=playerBlockMatch[1];
  const league=await db.prepare('SELECT id,name FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!league)throw fail('Liga no encontrada.',404);
  if(request.method==='GET'){
   const blocked=await db.prepare('SELECT player_id AS playerId,blocked_at AS blockedAt,blocked_by AS blockedBy FROM fantasy_player_blocks WHERE league_id=? ORDER BY blocked_at DESC,player_id').bind(leagueId).all();
   const players=[...new Map(catalog.teams.flatMap(team=>team.players.map(player=>[player.id,{id:player.id,name:player.name,team:team.name}]))).values()];
   return reply({league,blocked:blocked.results,players});
  }
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  const id=value?.playerId;
  if(typeof id!=='string'||id.length>128||!catalog.teams.some(t=>t.players.some(p=>p.id===id))||
    typeof value.blocked!=='boolean'||typeof value.expectedBlocked!=='boolean')throw fail('Bloqueo de jugador no válido.');
  const existing=await db.prepare('SELECT 1 FROM fantasy_player_blocks WHERE league_id=? AND player_id=?').bind(leagueId,id).first();
  if(Boolean(existing)!==value.expectedBlocked)throw fail('El bloqueo ha cambiado. Actualiza antes de guardar.',409);
  if(value.blocked===Boolean(existing))return reply({saved:true,playerId:id,blocked:value.blocked});
  let cancelledBids=0,cancelledOffers=0;
  if(value.blocked){
   const results=await db.batch([
    db.prepare('INSERT OR IGNORE INTO fantasy_player_blocks(league_id,player_id,blocked_by,blocked_at) VALUES(?,?,?,?)')
      .bind(leagueId,id,uid,currentTime),
    db.prepare("UPDATE fantasy_auction_bids SET status='invalid' WHERE league_id=? AND status='active' AND listing_id IN(SELECT id FROM fantasy_market_listings WHERE league_id=? AND player_id=?)")
      .bind(leagueId,leagueId,id),
    db.prepare("UPDATE fantasy_offers SET status='cancelled' WHERE league_id=? AND player_id=? AND status='pending'")
      .bind(leagueId,id)
   ]);
   if(results[0]?.meta?.changes!==1)throw fail('El jugador ya estaba bloqueado. Actualiza la lista.',409);
   cancelledBids=results[1]?.meta?.changes||0;
   cancelledOffers=results[2]?.meta?.changes||0;
  }else{
   const change=await db.prepare('DELETE FROM fantasy_player_blocks WHERE league_id=? AND player_id=?').bind(leagueId,id).run();
   if(change.meta?.changes!==1)throw fail('El jugador ya estaba desbloqueado. Actualiza la lista.',409);
  }
  return reply({saved:true,playerId:id,blocked:value.blocked,cancelledBids,cancelledOffers});
 }
 const lifecycleMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/lifecycle$/);
 if(lifecycleMatch){
  const leagueId=lifecycleMatch[1];
  const league=await db.prepare('SELECT id,name FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!league)throw fail('Liga no encontrada.',404);
  const existing=await db.prepare('SELECT state,revision,updated_at,updated_by FROM fantasy_league_lifecycle WHERE league_id=?').bind(leagueId).first();
  const current={state:existing?.state||'active',revision:existing?.revision||0,updatedAt:existing?.updated_at||0,updatedBy:existing?.updated_by||null};
  if(request.method==='GET')return reply({leagueId,name:league.name,...current});
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  if(!['active','paused','archived'].includes(value?.state)||!Number.isSafeInteger(value?.revision)||value.revision<0)throw fail('Estado de liga no válido.');
  if(value.state==='archived'&&value.confirmation!=='ARCHIVAR '+league.name)throw fail('Escribe la confirmación exacta para archivar la liga.');
  if(value.revision!==current.revision)throw fail('La liga ha cambiado. Actualiza sus ajustes.',409);
  if(value.state===current.state)return reply({leagueId,name:league.name,...current,saved:true});
  const saved=await db.prepare(`INSERT INTO fantasy_league_lifecycle(league_id,state,revision,updated_at,updated_by)
    VALUES(?,?,1,?,?) ON CONFLICT(league_id) DO UPDATE SET
    state=excluded.state,revision=fantasy_league_lifecycle.revision+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by
    WHERE fantasy_league_lifecycle.revision=? RETURNING state,revision,updated_at,updated_by`)
    .bind(leagueId,value.state,currentTime,uid,value.revision).first();
  if(!saved)throw fail('Otro administrador ha cambiado el estado. Actualiza antes de guardar.',409);
  return reply({leagueId,name:league.name,state:saved.state,revision:saved.revision,updatedAt:saved.updated_at,updatedBy:saved.updated_by,saved:true});
 }
 // Participant writes are blocked even if a client hides the pause/archive badge.
 const leagueMutation=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\//);
 if(leagueMutation&&request.method!=='GET'){
  const state=await db.prepare('SELECT state FROM fantasy_league_lifecycle WHERE league_id=?').bind(leagueMutation[1]).first();
  if(state?.state&&state.state!=='active')throw fail(state.state==='archived'?'Esta liga está archivada y es de solo lectura.':'Esta liga está pausada por el Club.',409);
 }
 if(path==='/api/fantasy/admin/leagues/reset'&&request.method==='GET'){
   const leagues=await db.prepare('SELECT id,name,created_at FROM fantasy_leagues ORDER BY name,id').all();
   return reply({leagues:leagues.results});
 }
 if(path==='/api/fantasy/admin/activity'){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const events=await db.prepare(`SELECT activity_type AS type,scope,actor,created_at AS createdAt,summary
   FROM (
    SELECT 'league' AS activity_type,league_id AS scope,actor_uid AS actor,created_at,
           json_extract(after_json,'$.name') AS summary FROM fantasy_league_admin_events
    UNION ALL
    SELECT 'scoring' AS activity_type,'global' AS scope,actor_uid AS actor,created_at,
           'Puntuaciones de Fantasy' AS summary FROM fantasy_point_history
    UNION ALL
    SELECT 'lifecycle' AS activity_type,league_id AS scope,actor_uid AS actor,created_at,
           CASE new_state WHEN 'paused' THEN 'Liga pausada' WHEN 'archived' THEN 'Liga archivada' ELSE 'Liga reactivada' END AS summary
    FROM fantasy_league_lifecycle_events
   )
   ORDER BY created_at DESC LIMIT 50`).all();
  return reply({events:events.results});
 }
 if(path==='/api/fantasy/admin/leagues/history'){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const leagueId=url.searchParams.get('league');
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(leagueId||''))throw fail('Liga no válida.');
  const events=await db.prepare(`SELECT actor,kind,beforeJson,afterJson,createdAt FROM (
    SELECT actor_uid AS actor,kind,before_json AS beforeJson,after_json AS afterJson,created_at AS createdAt,id
      FROM fantasy_league_admin_events WHERE league_id=?
    UNION ALL
    SELECT actor_uid AS actor,'lifecycle' AS kind,json_object('state',old_state) AS beforeJson,
      json_object('state',new_state) AS afterJson,created_at AS createdAt,id
      FROM fantasy_league_lifecycle_events WHERE league_id=?
   ) ORDER BY createdAt DESC,id DESC LIMIT 50`).bind(leagueId,leagueId).all();
  return reply({events:events.results.map(event=>({...event,before:JSON.parse(event.beforeJson),after:JSON.parse(event.afterJson),beforeJson:undefined,afterJson:undefined}))});
 }
 const duplicateMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/duplicate$/);
 if(duplicateMatch){
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const sourceId=duplicateMatch[1],value=await body(request);
  const name=typeof value?.name==='string'?value.name.trim().replace(/\s+/g,' '):'';
  const nickname=typeof value?.nickname==='string'?value.nickname.trim().replace(/\s+/g,' '):'';
  if(name.length<3||name.length>60||/[\u0000-\u001f\u007f<>]/.test(name))throw fail('Nombre de liga no válido.');
  if(nickname.length<2||nickname.length>32||/[\u0000-\u001f\u007f<>]/.test(nickname))throw fail('Nombre de participante no válido.');
  if(!/^[a-zA-Z0-9_-]{8,80}$/.test(value?.requestId||''))throw fail('Solicitud de creación no válida.');
  const previous=await db.prepare('SELECT id,name FROM fantasy_leagues WHERE owner_uid=? AND request_id=?').bind(uid,value.requestId).first();
  if(previous)return reply({saved:true,alreadyCreated:true,id:previous.id,name:previous.name});
  const source=await db.prepare('SELECT l.id,l.settings_json,l.pool_json,COALESCE(g.team_id,json_extract(l.pool_json,\'$.teamId\')) AS team_id FROM fantasy_leagues l LEFT JOIN fantasy_league_groups g ON g.league_id=l.id WHERE l.id=?').bind(sourceId).first();
  if(!source||!(source.team_id==='private-invitation'||teams.some(t=>t.id===source.team_id)))throw fail('Liga de origen no encontrada.',404);
  const newId=crypto.randomUUID(),code=makeCode();
  await db.batch([
   db.prepare('INSERT INTO fantasy_leagues(id,owner_uid,request_id,fingerprint,name,mode,pool_json,settings_json,code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
     .bind(newId,uid,value.requestId,'admin-copy-v1',name,'custom',source.pool_json,source.settings_json,code,currentTime),
   db.prepare('INSERT INTO fantasy_league_groups(league_id,team_id) VALUES(?,?)').bind(newId,source.team_id),
   db.prepare('INSERT INTO fantasy_members(league_id,uid,nickname,joined_at) VALUES(?,?,?,?)').bind(newId,uid,nickname,currentTime)
  ]);
  return reply({saved:true,id:newId,name,sourceId,code,onlyConfiguration:true},201);
 }
 const lineupLockMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/lineup-lock$/);
 if(lineupLockMatch){
  if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
  const leagueId=lineupLockMatch[1],row=await db.prepare('SELECT settings_json FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!row)throw fail('Liga no encontrada.',404);
  const settings=JSON.parse(row.settings_json),locked=settings.lineupsLocked===true;
  if(request.method==='GET')return reply({leagueId,locked});
  const value=await body(request);
  if(typeof value?.locked!=='boolean'||typeof value?.expectedLocked!=='boolean')throw fail('Indica el bloqueo y el estado consultado.');
  if(value.expectedLocked!==locked)throw fail('El bloqueo ha cambiado. Actualiza.',409);
  const next=JSON.stringify({...settings,lineupsLocked:value.locked});
  const changed=await db.prepare('UPDATE fantasy_leagues SET settings_json=? WHERE id=? AND settings_json=? RETURNING id').bind(next,leagueId,row.settings_json).first();
  if(!changed)throw fail('El bloqueo de la liga ha cambiado. Actualiza.',409);
  return reply({leagueId,locked:value.locked,saved:true});
 }
 const visibilityMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/visibility$/);
 if(visibilityMatch){
  if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
  const leagueId=visibilityMatch[1],row=await db.prepare('SELECT settings_json,mode FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!row)throw fail('Liga no encontrada.',404);
  const settings=JSON.parse(row.settings_json),isPublic=row.mode==='custom'&&settings.publicLeague===true;
  if(request.method==='GET')return reply({leagueId,public:isPublic,editable:row.mode==='custom'});
  const value=await body(request);
  if(row.mode!=='custom')throw fail('Solo se puede cambiar la visibilidad de ligas personalizadas.');
  if(typeof value?.public!=='boolean'||typeof value?.expectedPublic!=='boolean')throw fail('Indica la visibilidad y el estado consultado.');
  if(value.expectedPublic!==isPublic)throw fail('La visibilidad ha cambiado. Actualiza.',409);
  if(settings.privateInvitation===true&&value.public)throw fail('Las ligas privadas requieren invitación.');
  const next=JSON.stringify({...settings,publicLeague:value.public});
  const result=await db.prepare('UPDATE fantasy_leagues SET settings_json=? WHERE id=? AND settings_json=? RETURNING id').bind(next,leagueId,row.settings_json).first();
  if(!result)throw fail('La liga ha cambiado. Actualiza antes de guardar.',409);
  return reply({leagueId,public:value.public,editable:true,saved:true});
 }
 const inscriptionsMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/inscriptions$/);
 if(inscriptionsMatch){
  if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
  const leagueId=inscriptionsMatch[1];
  const row=await db.prepare('SELECT settings_json FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!row)throw fail('Liga no encontrada.',404);
  const settings=JSON.parse(row.settings_json),open=settings.inscriptionsOpen!==false;
  if(request.method==='GET')return reply({leagueId,open});
  const value=await body(request);
  if(typeof value?.open!=='boolean'||typeof value?.expectedOpen!=='boolean')throw fail('Indica el estado y la versión consultada.');
  if(value.expectedOpen!==open)throw fail('La liga ha cambiado. Actualiza antes de guardar.',409);
  const next=JSON.stringify({...settings,inscriptionsOpen:value.open});
  const changed=await db.prepare('UPDATE fantasy_leagues SET settings_json=? WHERE id=? AND settings_json=? RETURNING id').bind(next,leagueId,row.settings_json).first();
  if(!changed)throw fail('Otro administrador modificó las inscripciones. Actualiza antes de guardar.',409);
  return reply({leagueId,open:value.open,saved:true});
 }
 const leagueExportMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/export$/);
 if(leagueExportMatch){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const leagueId=leagueExportMatch[1];
  const row=await db.prepare('SELECT id,name,mode,settings_json,created_at FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!row)throw fail('Liga no encontrada.',404);
  const members=await db.prepare('SELECT COUNT(*) AS total FROM fantasy_members WHERE league_id=?').bind(leagueId).first();
  return reply({format:'villalbilla-fantasy-league-settings-v1',exportedAt:new Date(currentTime).toISOString(),
    league:{id:row.id,name:row.name,mode:row.mode,settings:JSON.parse(row.settings_json),
      createdAt:row.created_at,memberCount:members?.total||0}});
 }
 const leagueSettingsMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/settings$/);
 if(leagueSettingsMatch){
  const leagueId=leagueSettingsMatch[1];
  const row=await db.prepare('SELECT name,mode,settings_json FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!row)throw fail('Liga no encontrada.',404);
  const settings=JSON.parse(row.settings_json);
  const members=(await db.prepare('SELECT COUNT(*) AS n FROM fantasy_members WHERE league_id=?').bind(leagueId).first()).n;
  const payload={id:leagueId,name:row.name,mode:row.mode,maxMembers:settings.maxMembers,memberCount:members};
  if(request.method==='GET')return reply(payload);
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request);
  const name=typeof value?.name==='string'?value.name.trim():'';
  const limit=value?.maxMembers;
  if(settings.privateInvitation===true&&limit!==15)throw fail('Las ligas privadas tienen un máximo fijo de 15 participantes.');
  if(name.length<3||name.length>60||/[\u0000-\u001f\u007f<>]/.test(name))throw fail('El nombre debe tener entre 3 y 60 caracteres, sin símbolos prohibidos.');
  if(!Number.isInteger(limit)||limit<2||limit>15)throw fail('El límite debe estar entre 2 y 15 participantes.');
  if(row.mode==='classic'&&limit!==settings.maxMembers)throw fail('El límite de una liga clásica es fijo. Para modificarlo crea una liga personalizada.');
  if(limit<members)throw fail('El límite no puede ser menor que los participantes actuales.',409);
  if(value.expectedName!==row.name||value.expectedMaxMembers!==settings.maxMembers)throw fail('La liga ha cambiado. Actualiza antes de guardar.',409);
  if(name===row.name&&limit===settings.maxMembers)return reply({...payload,saved:true});
  const next=JSON.stringify({...settings,maxMembers:limit});
  const auditId=crypto.randomUUID();
  const results=await db.batch([
    db.prepare('UPDATE fantasy_leagues SET name=?,settings_json=? WHERE id=? AND name=? AND settings_json=? AND (SELECT COUNT(*) FROM fantasy_members WHERE league_id=?)<=?')
      .bind(name,next,leagueId,row.name,row.settings_json,leagueId,limit),
    // changes() is the affected-row count of the immediately previous statement in this D1 batch.
    // Audit and update commit together; stale writes never create history entries.
    db.prepare("INSERT INTO fantasy_league_admin_events(id,league_id,actor_uid,kind,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1")
      .bind(auditId,leagueId,uid,'settings',JSON.stringify({name:row.name,maxMembers:settings.maxMembers}),JSON.stringify({name,maxMembers:limit}),currentTime),
  ]);
  if(results[0]?.meta?.changes!==1)throw fail('La liga o sus participantes han cambiado. Actualiza antes de guardar.',409);
  return reply({id:leagueId,name,maxMembers:limit,memberCount:members,mode:row.mode,saved:true});
 }
 const transferMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/transfer$/);
 if(transferMatch){
  const leagueId=transferMatch[1];
  if(request.method==='GET'){
   const [members,roster]=await Promise.all([
    db.prepare(`SELECT m.uid AS id,b.nickname AS name,COUNT(r.id) AS size
     FROM fantasy_managers m JOIN fantasy_members b ON b.league_id=m.league_id AND b.uid=m.uid
     LEFT JOIN fantasy_roster r ON r.league_id=m.league_id AND r.uid=m.uid
     WHERE m.league_id=? AND NOT EXISTS(SELECT 1 FROM fantasy_excluded_users e WHERE e.uid=m.uid)
     GROUP BY m.uid,b.nickname ORDER BY b.nickname,m.uid`).bind(leagueId).all(),
    db.prepare(`SELECT r.id,r.player_id AS playerId,r.uid AS ownerId,b.nickname AS owner
     FROM fantasy_roster r JOIN fantasy_members b ON b.league_id=r.league_id AND b.uid=r.uid
     WHERE r.league_id=?`).bind(leagueId).all(),
   ]);
   const owned=new Map(roster.results.map(r=>[r.playerId,r]));
   const players=new Map(catalog.teams.flatMap(t=>t.players.map(p=>[p.id,{id:p.id,name:p.name}])));
   return reply({teams:members.results,players:[...players.values()].map(p=>({...p,ownership:owned.get(p.id)||null}))});
  }
  const value=await body(request);
  if(!value||typeof value.targetId!=='string'||!value.targetId||value.targetId.length>128||
     !(value.ownershipId===null||typeof value.ownershipId==='string'&&value.ownershipId.length<=128)||
     !catalog.teams.some(t=>t.players.some(p=>p.id===value.playerId)))throw fail('Jugador o equipo de destino no válido.');
  if(!await transferFantasyPlayer(db,leagueId,value,clock()))
   throw fail('El propietario o el equipo ha cambiado, o el traspaso superaría los límites de 12 a 16 jugadores. Actualiza la selección.',409);
  return reply({saved:true});
 }
 const resetMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/(reset|delete)$/);
 if(resetMatch){
   if(request.method==='GET')return reply(await resetLeague({db,leagueId:resetMatch[1]}));
   if(request.method!=='POST')throw fail('Método no permitido.',405);
   const value=await body(request);
   return reply(await resetLeague({db,leagueId:resetMatch[1],remove:resetMatch[2]==='delete',confirm:value?.confirmation,
      expectedCreatedAt:value?.expectedCreatedAt,now:currentTime,apply:true}));
 }
 const clauseSwitch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/clauses$/);
 if(clauseSwitch){
  if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
  const old=await db.prepare('SELECT settings_json FROM fantasy_leagues WHERE id=?').bind(clauseSwitch[1]).first();
  if(!old)throw fail('Liga no encontrada.',404);
  if(request.method==='GET')return reply({enabled:JSON.parse(old.settings_json).clausesEnabled===true});
  const value=await body(request);
  if(typeof value?.enabled!=='boolean')throw fail('Indica si el club activa las cláusulas.');
  const next=JSON.stringify({...JSON.parse(old.settings_json),clausesEnabled:value.enabled});
  const saved=await db.prepare('UPDATE fantasy_leagues SET settings_json=? WHERE id=? AND settings_json=? RETURNING id')
    .bind(next,clauseSwitch[1],old.settings_json).first();
  if(!saved)throw fail('La configuración cambió. Actualiza antes de reintentar.',409);
  return reply({saved:true,enabled:value.enabled});
 }
 if(['/api/fantasy/admin/salaries','/api/fantasy/admin/awards'].includes(path)){let matchScope=null;if(path.endsWith('/awards')&&(url.searchParams.has('match')||url.searchParams.has('team'))){const matchId=url.searchParams.get('match'),teamId=url.searchParams.get('team');if(!/^\d{1,20}$/.test(matchId||'')||!teams.some(t=>t.id===teamId))throw fail('Partido no válido.');matchScope={matchId,teamId}}const result=await adminGame({db,path,method:request.method,readBody:()=>body(request),matchScope});if(path.endsWith('/awards')&&request.method==='POST'){await db.prepare('UPDATE fantasy_prize_state SET next_at=0,fingerprint=NULL').run();await db.prepare('UPDATE fantasy_ideal_reward_state SET next_at=0,fingerprint=NULL').run();ctx?.waitUntil?.(settleAwardEconomy(env,currentTime));}return reply(result)}
 if(path==='/api/fantasy/admin/player-stats'){
  if(!db)throw fail('Base de datos no disponible.',503);
  const schedule=await sports(db);
  if(request.method==='GET'){
   const teamId=url.searchParams.get('team'),matchId=url.searchParams.get('match');
   if(!teamId&&!matchId)return reply({matches:schedule.matches.filter(m=>m.closed).map(m=>({teamId:m.teamId,matchId:m.id,round:m.round,startsAt:m.startsAt,players:m.players.length})).sort((a,b)=>b.startsAt-a.startsAt).slice(0,150)});
   if(!/^\d{1,20}$/.test(teamId||'')||!/^\d{1,20}$/.test(matchId||''))throw fail('Partido no válido.');
   const match=schedule.matches.find(m=>m.teamId===teamId&&m.id===matchId&&m.closed);
   if(!match)throw fail('Acta cerrada no encontrada.',404);
   const previous=await db.prepare('SELECT player_id,stats_json,revision FROM fantasy_stat_corrections WHERE team_id=? AND match_id=?').bind(teamId,matchId).all();
   const revisions=new Map(previous.results.map(r=>[r.player_id,r.revision]));
   const history=await db.prepare('SELECT player_id,previous_json,stats_json,revision,actor_uid,updated_at FROM fantasy_stat_correction_history WHERE team_id=? AND match_id=? ORDER BY updated_at DESC LIMIT 30').bind(teamId,matchId).all();
   return reply({match:{teamId,matchId,round:match.round,players:match.players.filter(p=>/^\d{1,20}$/.test(String(p.id))).map(p=>({id:p.id,name:p.name||'',played:p.played,partial:p.partial,stats:{goals:p.goals??0,assists:p.assists??0,yellow:p.yellow??0,red:p.red??0,ownGoals:p.ownGoals??0,secondYellow:p.secondYellow?1:0},revision:revisions.get(p.id)||0}))},history:history.results});
  }
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const value=await body(request),teamId=String(value?.teamId||''),matchId=String(value?.matchId||''),playerId=String(value?.playerId||'');
  if(!/^\d{1,20}$/.test(teamId)||!/^\d{1,20}$/.test(matchId)||!/^\d{1,20}$/.test(playerId))throw fail('Identificador no válido.');
  const match=schedule.matches.find(m=>m.teamId===teamId&&m.id===matchId&&m.closed);
  if(!match||!match.players.some(p=>String(p.id)===playerId))throw fail('El jugador no pertenece a ese acta cerrada.',404);
  if(!Number.isSafeInteger(value.revision)||value.revision<0)throw fail('Actualiza las estadísticas antes de guardarlas.');
  const edits=statCorrections;
  if(!edits.validStats(value.stats))throw fail('Las estadísticas deben ser enteros de 0 a 20. La segunda amarilla debe ser 0 o 1 y requiere una roja.');
  const current=await db.prepare('SELECT stats_json,revision FROM fantasy_stat_corrections WHERE team_id=? AND match_id=? AND player_id=?').bind(teamId,matchId,playerId).first();
  if((current?.revision||0)!==value.revision)throw fail('Otro administrador ha modificado estas estadísticas. Actualiza.',409);
  const next=value.revision+1,encoded=JSON.stringify(value.stats),auditId=crypto.randomUUID();
  const results=await db.batch([
   db.prepare('INSERT INTO fantasy_stat_corrections(team_id,match_id,player_id,stats_json,revision,updated_at,actor_uid) VALUES(?,?,?,?,?,?,?) ON CONFLICT(team_id,match_id,player_id) DO UPDATE SET stats_json=excluded.stats_json,revision=fantasy_stat_corrections.revision+1,updated_at=excluded.updated_at,actor_uid=excluded.actor_uid WHERE fantasy_stat_corrections.revision=?').bind(teamId,matchId,playerId,encoded,next,currentTime,uid,value.revision),
   db.prepare('INSERT INTO fantasy_stat_correction_history(id,team_id,match_id,player_id,previous_json,stats_json,revision,actor_uid,updated_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM fantasy_stat_corrections WHERE team_id=? AND match_id=? AND player_id=? AND revision=? AND stats_json=?)').bind(auditId,teamId,matchId,playerId,current?.stats_json||null,encoded,next,uid,currentTime,teamId,matchId,playerId,next,encoded)
  ]);
  if(!results[0]?.meta?.changes)throw fail('Las estadísticas cambiaron en otro dispositivo. Actualiza.',409);
  await db.batch([db.prepare('UPDATE fantasy_prize_state SET next_at=0,fingerprint=NULL'),db.prepare('UPDATE fantasy_ideal_reward_state SET next_at=0,fingerprint=NULL')]);
  return reply({saved:true,revision:next,stats:value.stats});
 }
 if(path==='/api/fantasy/admin/players'&&request.method==='GET'){const teamId=url.searchParams.get('team');if(teamId&&!teams.some(t=>t.id===teamId))throw fail('Equipo no válido.');return reply({players:await prices(db,teamId?{type:'team',teamId}:{type:'club'}),updatedAt:catalog.updatedAt})}
 if(path==='/api/fantasy/admin/prices'&&request.method==='POST'){const value=await body(request),id=String(value.playerId||'');if(!catalog.teams.some(t=>t.players.some(p=>p.id===id)))throw fail('Jugador no encontrado.',404);if(value.price!==null&&(!Number.isFinite(value.price)||value.price<1||value.price>234||Math.abs(value.price*100-Math.round(value.price*100))>1e-7))throw fail('El precio debe estar entre 1 y 234 M, en pasos de 0,01 M.');if(!Number.isSafeInteger(value.revision)||value.revision<0)throw fail('Actualiza los precios antes de guardar.');const now=currentTime;const saved=await db.prepare('INSERT INTO fantasy_player_cents(player_id,price_cents,revision,updated_at,changed_by) SELECT ?,?,1,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM fantasy_player_cents WHERE player_id=?) ON CONFLICT(player_id) DO UPDATE SET price_cents=excluded.price_cents,revision=fantasy_player_cents.revision+1,updated_at=excluded.updated_at,changed_by=excluded.changed_by WHERE fantasy_player_cents.revision=? RETURNING player_id,price_cents,revision,updated_at').bind(id,value.price===null?null:Math.round(value.price*100),now,uid,value.revision,id,value.revision).first();if(!saved)throw fail('Otro administrador ha cambiado este precio. Actualiza la lista antes de guardar.',409);return reply({playerId:saved.player_id,price:saved.price_cents==null?null:saved.price_cents/100,revision:saved.revision,updatedAt:saved.updated_at})}
 const participantsMatch=path.match(/^\/api\/fantasy\/admin\/leagues\/([a-zA-Z0-9-]{1,80})\/participants$/);
 if(participantsMatch){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const leagueId=participantsMatch[1];
  if(!admin)throw fail('Acceso reservado a administradores.',403);
  const row=await db.prepare('SELECT settings_json,owner_uid FROM fantasy_leagues WHERE id=?').bind(leagueId).first();
  if(!row)throw fail('Liga no encontrada.',404);
  const settings=JSON.parse(row.settings_json);
  const {results}=await db.prepare('SELECT m.nickname, m.joined_at AS joinedAt, CASE WHEN m.uid=? THEN 1 ELSE 0 END AS creator, EXISTS(SELECT 1 FROM fantasy_excluded_users x WHERE x.uid=m.uid) AS excluded FROM fantasy_members m WHERE m.league_id=? ORDER BY m.joined_at,m.nickname').bind(row.owner_uid,leagueId).all();
  return reply({memberCount:results.length,maxMembers:settings.maxMembers||15,members:results.map(m=>({nickname:m.nickname,joinedAt:m.joinedAt,creator:!!m.creator,excluded:!!m.excluded}))});
 }
 if(path==='/api/fantasy/leagues'&&request.method==='GET'){const rows=await db.prepare('SELECT l.*,COALESCE(v.delta_cents,ROUND(w.delta_units*50),0) AS delta_cents,COALESCE(g.team_id,json_extract(l.pool_json,\'$.teamId\')) AS group_team_id,m.joined_at AS joinedAt,(SELECT COUNT(*) FROM fantasy_members x WHERE x.league_id=l.id) AS memberCount FROM fantasy_leagues l JOIN fantasy_members m ON m.league_id=l.id LEFT JOIN fantasy_wallets w ON w.league_id=l.id AND w.uid=m.uid LEFT JOIN fantasy_wallet_cents v ON v.league_id=l.id AND v.uid=m.uid LEFT JOIN fantasy_league_groups g ON g.league_id=l.id WHERE m.uid=? ORDER BY l.created_at DESC').bind(uid).all();const ids=await allowedTeams();const economy=await economyPolicy(db),holds=(await db.prepare("SELECT b.league_id,SUM(b.amount_cents) AS held FROM fantasy_auction_bids b JOIN fantasy_auction_rounds r ON r.league_id=b.league_id AND r.listing_id=b.listing_id AND r.day=b.day WHERE b.uid=? AND b.status='active' AND r.status='open' GROUP BY b.league_id").bind(uid).all()).results;const official=(await db.prepare('SELECT o.team_id,o.league_id,l.settings_json,(SELECT COUNT(*) FROM fantasy_members m WHERE m.league_id=l.id) AS member_count FROM fantasy_official_leagues o JOIN fantasy_leagues l ON l.id=o.league_id').all()).results,joined=new Set(rows.results.map(r=>r.id));const publicCandidates=(await db.prepare("SELECT l.id,l.name,g.team_id,l.settings_json,(SELECT COUNT(*) FROM fantasy_members m WHERE m.league_id=l.id) AS member_count FROM fantasy_leagues l JOIN fantasy_league_groups g ON g.league_id=l.id WHERE l.mode='custom' AND json_extract(l.settings_json,'$.publicLeague')=1 ORDER BY l.created_at DESC LIMIT 200").all()).results;
 const publicChoices=publicCandidates.filter(r=>ids.includes(r.team_id)&&!joined.has(r.id)&&JSON.parse(r.settings_json).inscriptionsOpen!==false).map(r=>({id:r.id,teamId:r.team_id,name:r.name,memberCount:r.member_count,maxMembers:JSON.parse(r.settings_json).maxMembers||15,kind:'public'}));
 const createSetting=await db.prepare('SELECT enabled FROM fantasy_league_creation_settings WHERE id=1').first();return reply({creationEnabled:createSetting?.enabled===1,eligibleTeams:teams.filter(t=>ids.includes(t.id)),availableLeagues:[...official.filter(r=>ids.includes(r.team_id)&&!joined.has(r.league_id)).map(r=>({id:r.league_id,teamId:r.team_id,name:leaguePolicy.classicLeagueName(teams.find(t=>t.id===r.team_id)),memberCount:r.member_count,maxMembers:JSON.parse(r.settings_json).maxMembers||15,kind:'official'})),...teams.filter(t=>ids.includes(t.id)&&!official.some(r=>r.team_id===t.id)).map(t=>({id:'official-2026-27-'+t.id,teamId:t.id,name:leaguePolicy.classicLeagueName(t),memberCount:0,maxMembers:leaguePolicy.classicSettings.maxMembers||15,kind:'official',canStart:true})),...publicChoices],leagues:rows.results.filter(r=>ids.includes(r.group_team_id)).map(r=>publicLeague({...r,reserved_cents:holds.find(h=>h.league_id===r.id)?.held||0},uid,currentTime,economy))})}
 if(path==='/api/fantasy/leagues'&&request.method==='POST'){
  const toggle=await db.prepare('SELECT enabled FROM fantasy_league_creation_settings WHERE id=1').first();
  if(toggle?.enabled!==1)throw fail('La creación de nuevas ligas está desactivada por el club.',403);
  const value=await body(request);
  const selected='private-invitation';
  const eligible=await allowedTeams();
  const name=String(value?.name||'').trim().replace(/\s+/g,' ');
  const nickname=String(value?.nickname||'').trim().replace(/\s+/g,' ');
  if(name.length<3||name.length>60||/[\x00-\x1f\x7f<>]/.test(name))throw fail('El nombre de la liga debe tener entre 3 y 60 caracteres.',400);
  if(nickname.length<2||nickname.length>32||/[\x00-\x1f\x7f<>]/.test(nickname))throw fail('El nombre de participante debe tener entre 2 y 32 caracteres.',400);
    if(!/^[a-zA-Z0-9_-]{8,80}$/.test(value?.requestId||''))throw fail('Solicitud de creación no válida.',400);
  const previous=await db.prepare('SELECT id FROM fantasy_leagues WHERE owner_uid=? AND request_id=?').bind(uid,value.requestId).first();
  if(previous)return reply(await detail(db,previous.id,uid,currentTime,eligible));
  const id=crypto.randomUUID(),code=makeCode(),settings=JSON.stringify({...leaguePolicy.classicSettings,privateInvitation:true,maxMembers:15,publicLeague:false,points:JSON.parse((await db.prepare('SELECT points_json FROM fantasy_point_settings WHERE id=1').first())?.points_json||JSON.stringify(leaguePolicy.classicSettings.points))});
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO fantasy_leagues(id,owner_uid,request_id,fingerprint,name,mode,pool_json,settings_json,code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,uid,value.requestId,'user-created-v1',name,'custom',JSON.stringify({type:'club'}),settings,code,currentTime),
   db.prepare('INSERT OR IGNORE INTO fantasy_league_groups(league_id,team_id) VALUES(?,?)').bind(id,selected),
   db.prepare('INSERT OR IGNORE INTO fantasy_members(league_id,uid,nickname,joined_at) VALUES(?,?,?,?)').bind(id,uid,nickname,currentTime)
  ]);
  return reply(await detail(db,id,uid,currentTime,eligible),201);
 }
 if(path==='/api/fantasy/team-league'&&request.method==='POST'){
 const value=await body(request),teamId=String(value.teamId||''),nickname=String(value.nickname||'').trim();
 if(!(await allowedTeams()).includes(teamId))throw fail('Solo jugadores y cuerpo técnico identificados en las actas de este equipo pueden entrar.',403);
 if(nickname.length<2||nickname.length>32)throw fail('Escribe tu nombre en la liga (2–32 caracteres).');
 let existing=await db.prepare('SELECT league_id FROM fantasy_official_leagues WHERE team_id=?').bind(teamId).first();
 if(value.leagueId&&!existing&&value.leagueId!=='official-2026-27-'+teamId)throw fail('La liga disponible ha cambiado. Actualiza la lista antes de entrar.',409);
 if(!existing){const id='official-2026-27-'+teamId,code=makeCode(),settings=JSON.stringify({...leaguePolicy.classicSettings,points:JSON.parse((await db.prepare('SELECT points_json FROM fantasy_point_settings WHERE id=1').first())?.points_json||JSON.stringify(leaguePolicy.classicSettings.points))});await db.batch([
 db.prepare('INSERT OR IGNORE INTO fantasy_leagues VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,'club-system',id,id,leaguePolicy.classicLeagueName(teams.find(t=>t.id===teamId)),'classic',JSON.stringify({type:'club'}),settings,code,currentTime),
 db.prepare('INSERT OR IGNORE INTO fantasy_league_groups VALUES(?,?)').bind(id,teamId),
 db.prepare('INSERT OR IGNORE INTO fantasy_official_leagues VALUES(?,?)').bind(teamId,id)
 ]);existing=await db.prepare('SELECT league_id FROM fantasy_official_leagues WHERE team_id=?').bind(teamId).first()}
 if(value.leagueId&&value.leagueId!==existing.league_id)throw fail('La liga disponible ha cambiado. Actualiza la lista antes de entrar.',409);
 const member=await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(existing.league_id,uid).first();
 if(!member){
  const joined=await db.prepare("INSERT OR IGNORE INTO fantasy_members(league_id,uid,nickname,joined_at) SELECT id,?,?,? FROM fantasy_leagues WHERE id=? AND COALESCE(json_extract(settings_json,'$.inscriptionsOpen'),1)!=0").bind(uid,nickname,currentTime,existing.league_id).run();
  if(!joined.meta?.changes&&!await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(existing.league_id,uid).first())throw fail('Las inscripciones de esta liga están cerradas.',403);
 }
 return reply(await detail(db,existing.league_id,uid,currentTime,await allowedTeams()))
 }
 if(path==='/api/fantasy/join-public'&&request.method==='POST'){
  const value=await body(request),leagueId=String(value?.leagueId||''),nickname=String(value?.nickname||'').trim();
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(leagueId)||nickname.length<2||nickname.length>32)throw fail('Liga o nombre no válido.');
  const league=await db.prepare("SELECT l.id,g.team_id FROM fantasy_leagues l JOIN fantasy_league_groups g ON g.league_id=l.id WHERE l.id=? AND l.mode='custom' AND json_extract(l.settings_json,'$.publicLeague')=1").bind(leagueId).first();
  if(!league)throw fail('Esta liga no está disponible públicamente.',404);
  if(!(await allowedTeams()).includes(league.team_id))throw fail('Solo los compañeros autorizados de este equipo pueden entrar.',403);
  const member=await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(league.id,uid).first();
  if(!member){
   const joined=await db.prepare("INSERT OR IGNORE INTO fantasy_members(league_id,uid,nickname,joined_at) SELECT id,?,?,? FROM fantasy_leagues WHERE id=? AND mode='custom' AND json_extract(settings_json,'$.publicLeague')=1 AND COALESCE(json_extract(settings_json,'$.inscriptionsOpen'),1)!=0").bind(uid,nickname,currentTime,league.id).run();
   if(!joined.meta?.changes&&!await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(league.id,uid).first())throw fail('La liga ya no admite nuevos participantes.',403);
  }
  return reply(await detail(db,league.id,uid,currentTime,await allowedTeams()));
 }
 if(path==='/api/fantasy/join'&&request.method==='POST'){const value=await body(request),code=String(value.code||'').trim().toUpperCase(),nickname=String(value.nickname||'').trim();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)||nickname.length<2||nickname.length>32)throw fail('Escribe el código de ocho caracteres y tu nombre en la liga.');const league=await db.prepare('SELECT l.id,COALESCE(g.team_id,json_extract(l.pool_json,\'$.teamId\')) AS team_id FROM fantasy_leagues l LEFT JOIN fantasy_league_groups g ON g.league_id=l.id WHERE l.code=?').bind(code).first();if(!league)throw fail('Código de invitación no válido.',404);if(!(await allowedTeams()).includes(league.team_id))throw fail('El código solo permite entrar a compañeros de ese equipo aprobado.',403);const member=await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(league.id,uid).first();if(!member){
  const joined=await db.prepare("INSERT OR IGNORE INTO fantasy_members(league_id,uid,nickname,joined_at) SELECT id,?,?,? FROM fantasy_leagues WHERE id=? AND COALESCE(json_extract(settings_json,'$.inscriptionsOpen'),1)!=0").bind(uid,nickname,currentTime,league.id).run();
  if(!joined.meta?.changes&&!await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(league.id,uid).first())throw fail('Las inscripciones de esta liga están cerradas.',403);
 }return reply(await detail(db,league.id,uid,currentTime,await allowedTeams()))}
 if(path==='/api/fantasy/inbox')return reply(await inbox({db,uid,allowed:await allowedTeams(),method:request.method,value:request.method==='POST'?await body(request):{},before:url.searchParams.get('before'),now:currentTime,players:catalog.teams.flatMap(t=>t.players.map(p=>({...p,teamId:t.id}))),teams}));
 if(path==='/api/fantasy/prize-receipts'){if(request.method!=='GET')throw fail('Método no permitido.',405);const row=await pendingPrize(db,uid,await allowedTeams());return reply({receipt:row?{id:row.id,leagueId:row.league_id,leagueName:row.mode==='classic'?leaguePolicy.classicLeagueName(teams.find(t=>t.id===row.team_id)):row.name,week:row.week,date:new Date((row.week*7-3)*86400000).toISOString().slice(0,10),amount:row.amount_cents/100,total:row.total_cents/100,position:row.position,adjustment:!row.initial,provisional:!!row.provisional,at:row.created_at}:null})}
 if(path==='/api/fantasy/prize-receipts/seen'){if(request.method!=='POST')throw fail('Método no permitido.',405);const value=await body(request);return reply(await acknowledgePrize(db,uid,await allowedTeams(),value?.eventId,currentTime))}
 if(path==='/api/fantasy/purchase-receipts'){if(request.method!=='GET')throw fail('Método no permitido.',405);const row=await pendingPurchase(db,uid,await allowedTeams());if(!row)return reply({receipt:null});const settings=JSON.parse(row.settings_json),player=(await prices(db,{type:'club'},settings.points)).find(p=>p.id===row.player_id);return reply({receipt:{id:row.id,leagueId:row.league_id,leagueName:row.mode==='classic'?leaguePolicy.classicLeagueName(teams.find(t=>t.id===row.team_id)):row.name,playerId:row.player_id,player:player||{id:row.player_id,name:'Jugador',stats:{},partial:true},paid:row.paid_cents/100,auction:!!row.auction,at:row.created_at}})}
 if(path==='/api/fantasy/purchase-receipts/seen'){if(request.method!=='POST')throw fail('Método no permitido.',405);const value=await body(request);return reply(await acknowledgePurchase(db,uid,await allowedTeams(),value?.tradeId,currentTime))}
 const history=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/market-history$/);if(history){if(request.method!=='GET')throw fail('Método no permitido.',405);await detail(db,history[1],uid,currentTime,await allowedTeams());return reply(await marketHistory({db,leagueId:history[1],uid,players:catalog.teams.flatMap(t=>t.players.map(p=>({...p,teamId:t.id}))),mine:url.searchParams.get('mine')==='1',cursor:url.searchParams.get('cursor')}))}
 const listing=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/list-player$/);
 if(listing){
  const data=await detail(db,listing[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  const submitted=request.method==='POST'?await body(request):null;
  // Cancel an existing sale listing even when new acquisitions are closed.
  if(request.method==='POST'&&submitted?.cancel!==true)await assertMarketOpen(data.league.id);
  return reply(await managerListingRoute({db,league:data.league,uid,now:currentTime,
    getNow:clock,method:request.method,readBody:async()=>submitted,
    playerId:url.searchParams.get('playerId'),players:request.method==='GET'||submitted?.acceptGame===true?await prices(db,data.league.pool,data.league.settings.points):undefined}));
 }
 const sale=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/sell$/);if(sale){const data=await detail(db,sale[1],uid,currentTime,await allowedTeams());await ensureManager(db,data.league,uid);if(request.method==='POST')await assertMarketOpen(data.league.id);return reply(await saleRoute({db,league:data.league,uid,now:clock(),getNow:clock,method:request.method,playerId:url.searchParams.get('playerId'),readBody:()=>body(request),players:await prices(db,data.league.pool,data.league.settings.points)}))}
 const privacyMatch=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/team-privacy$/);
 if(privacyMatch){
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const leagueId=privacyMatch[1];
  await detail(db,leagueId,uid,currentTime,await allowedTeams());
  const membership=await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(leagueId,uid).first();
  if(!membership)throw fail('Solo puedes cambiar la privacidad de tu propio equipo.',403);
  const value=await body(request);
  if(typeof value?.visible!=='boolean'||!Number.isSafeInteger(value?.revision)||value.revision<0)throw fail('Actualiza tus ajustes de privacidad antes de guardarlos.');
  const previous=await db.prepare('SELECT visible,revision FROM fantasy_team_photo_privacy WHERE league_id=? AND uid=?').bind(leagueId,uid).first();
  const revision=previous?.revision??0,visible=previous?.visible!==0;
  if(value.revision!==revision)throw fail('La privacidad ha cambiado desde otro dispositivo. Actualiza antes de guardar.',409);
  if(value.visible===visible)return reply({saved:true,visible,revision});
  const next=await db.prepare(`INSERT INTO fantasy_team_photo_privacy(league_id,uid,visible,revision,updated_at)
   VALUES(?,?,?,1,?) ON CONFLICT(league_id,uid) DO UPDATE SET
    visible=excluded.visible,revision=fantasy_team_photo_privacy.revision+1,updated_at=excluded.updated_at
    WHERE fantasy_team_photo_privacy.revision=? RETURNING visible,revision`)
    .bind(leagueId,uid,value.visible?1:0,currentTime,revision).first();
  if(!next)throw fail('La privacidad ha cambiado desde otro dispositivo. Actualiza antes de guardar.',409);
  return reply({saved:true,visible:next.visible===1,revision:next.revision});
 }
 const profileMatch=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/team-profile$/);
 if(profileMatch){
  const leagueId=profileMatch[1];
  await detail(db,leagueId,uid,currentTime,await allowedTeams());
  if(request.method==='GET'){
   const members=await db.prepare('SELECT m.uid AS id,m.nickname AS name,CASE WHEN m.uid=? OR COALESCE(v.visible,1)=1 THEN p.photo_data ELSE NULL END AS photo,COALESCE(v.visible,1) AS photo_visible,COALESCE(v.revision,0) AS photo_revision FROM fantasy_members m LEFT JOIN fantasy_team_photos p ON p.league_id=m.league_id AND p.uid=m.uid LEFT JOIN fantasy_team_photo_privacy v ON v.league_id=m.league_id AND v.uid=m.uid WHERE m.league_id=? ORDER BY m.nickname').bind(uid,leagueId).all();
   return reply({teams:members.results.map(m=>({id:m.id,name:m.name,photo:m.photo||null,me:m.id===uid,photoVisible:m.photo_visible===1,privacyRevision:m.id===uid?m.photo_revision:undefined}))});
  }
  if(request.method!=='POST')throw fail('Método no permitido.',405);
  const input=await body(request,70000),name=identity.normalizeTeamName(input?.name);
  if(!identity.validTeamName(name))throw fail('El nombre debe tener entre 2 y 32 caracteres sin símbolos de control.');
  const photo=input?.photo;
  if(photo!==undefined&&!identity.validTeamPhoto(photo))throw fail('La imagen debe ser JPG, PNG o WebP y ocupar menos de 48 KB.');
  const member=await db.prepare('SELECT 1 FROM fantasy_members WHERE league_id=? AND uid=?').bind(leagueId,uid).first();
  if(!member)throw fail('Solo puedes editar tu propio equipo.',403);
  await db.prepare('UPDATE fantasy_members SET nickname=? WHERE league_id=? AND uid=?').bind(name,leagueId,uid).run();
  if(photo!==undefined){
   if(photo===null)await db.prepare('DELETE FROM fantasy_team_photos WHERE league_id=? AND uid=?').bind(leagueId,uid).run();
   else await db.prepare('INSERT INTO fantasy_team_photos(league_id,uid,photo_data,updated_at) VALUES(?,?,?,?) ON CONFLICT(league_id,uid) DO UPDATE SET photo_data=excluded.photo_data,updated_at=excluded.updated_at').bind(leagueId,uid,photo,currentTime).run();
  }
  return reply({saved:true,name});
 }
 const loanMatch=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/loans(?:\/([a-zA-Z0-9-]{1,80}\/(?:accept|reject|cancel)))?$/);
 if(loanMatch){
  const data=await detail(db,loanMatch[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  if(request.method==='POST'&&(!loanMatch[2]||loanMatch[2].endsWith('/accept')))await assertMarketOpen(data.league.id);
  return reply(await loanRoute({db,league:data.league,uid,now:clock(),method:request.method,action:loanMatch[2]||'',readBody:()=>body(request),canPlay:async target=>!!await db.prepare('SELECT 1 FROM fantasy_participant_teams WHERE uid=? AND team_id=?').bind(target,data.league.teamId).first()}));
 }
 const exchangeMatch=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/exchanges(?:\/([a-zA-Z0-9-]{1,80}\/(?:accept|reject|cancel)))?$/);
 if(exchangeMatch){
  const data=await detail(db,exchangeMatch[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  if(request.method==='POST'&&(!exchangeMatch[2]||exchangeMatch[2].endsWith('/accept')))await assertMarketOpen(data.league.id);
  return reply(await exchangeRoute({db,league:data.league,uid,now:clock(),method:request.method,action:exchangeMatch[2]||'',readBody:()=>body(request),canPlay:async target=>!!await db.prepare('SELECT 1 FROM fantasy_participant_teams WHERE uid=? AND team_id=?').bind(target,data.league.teamId).first()}));
 }
 const rivalsMatch=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/rivals$/);
 if(rivalsMatch){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const data=await detail(db,rivalsMatch[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  const [members,roster,availablePlayers,listings]=await Promise.all([
   db.prepare('SELECT m.uid,m.nickname,CASE WHEN COALESCE(v.visible,1)=1 THEN p.photo_data ELSE NULL END AS photo FROM fantasy_members m LEFT JOIN fantasy_team_photos p ON p.league_id=m.league_id AND p.uid=m.uid LEFT JOIN fantasy_team_photo_privacy v ON v.league_id=m.league_id AND v.uid=m.uid WHERE m.league_id=? AND m.uid<>? ORDER BY m.nickname,m.uid').bind(rivalsMatch[1],uid).all(),
   db.prepare('SELECT id,uid,player_id,acquired_at FROM fantasy_roster WHERE league_id=? AND uid<>? ORDER BY acquired_at').bind(rivalsMatch[1],uid).all(),
   prices(db,data.league.pool,data.league.settings.points),
   db.prepare('SELECT m.ownership_id,m.listing_id,m.min_cents,m.expires_at FROM fantasy_manager_listings m JOIN fantasy_market_listings l ON l.id=m.listing_id AND l.league_id=m.league_id WHERE m.league_id=? AND m.uid<>? AND m.expires_at>? AND l.retired_day IS NULL').bind(rivalsMatch[1],uid,currentTime).all()
  ]);
  const listingByOwner=new Map(listings.results.map(l=>[l.ownership_id,l]));
  const directory=new Map(availablePlayers.map(p=>[p.id,p]));
  const grouped=new Map(members.results.map(m=>[m.uid,{id:m.uid,name:m.nickname,photo:m.photo||null,players:[]}])); 
  for(const own of roster.results){
   const rival=grouped.get(own.uid),player=directory.get(own.player_id);
   if(!rival||!player)continue;
   const listing=listingByOwner.get(own.id);
   rival.players.push({...player,ownershipId:own.id,acquiredAt:own.acquired_at,mine:false,forSale:!!listing,...(listing?{listingId:listing.listing_id,minPrice:listing.min_cents/100,expiresAt:listing.expires_at}:{})});
  }
  const rivals=[...grouped.values()].map(rival=>({...rival,players:rival.players.sort((a,b)=>(b.fantasyPoints||0)-(a.fantasyPoints||0)||a.name.localeCompare(b.name,'es'))}));
  return reply({rivals,clausesEnabled:data.league.settings.clausesEnabled===true});
 }
 const seasonPublicMatch=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/seasons$/);
 if(seasonPublicMatch){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const data=await detail(db,seasonPublicMatch[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  return reply(await listSeasonArchives(db,data.league.id));
 }
 const breakdownMatch=path.match(/^\/api\/fantasy\/leagues\/([A-Za-z0-9-]{1,80})\/rounds\/([0-9]{1,8})\/participants\/([A-Za-z0-9_-]{1,128})$/);
 if(breakdownMatch){
  if(request.method!=='GET')throw fail('Método no permitido.',405);
  const data=await detail(db,breakdownMatch[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  return reply(await roundPlayerBreakdown(db,data.league,breakdownMatch[3],Number(breakdownMatch[2]),currentTime));
 }
 const game=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/(squad|coaches|coach|presentation|search|favourites|alerts|lineup|table|transactions)$/);if(game){const data=await detail(db,game[1],uid,currentTime,await allowedTeams());const snapshot={},players=['table','alerts','presentation','coaches'].includes(game[2])?[]:await prices(db,data.league.pool,data.league.settings.points,snapshot);return reply(await gameRoute({db,league:data.league,uid,now:currentTime,action:game[2],getNow:clock,targetNext:url.searchParams.get('next')==='1',method:request.method,readBody:()=>body(request),players,sportsSnapshot:snapshot.live}))}
 const clause=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/(clause(?:\/boost)?)$/);
 if(clause){
  const data=await detail(db,clause[1],uid,currentTime,await allowedTeams());
  await ensureManager(db,data.league,uid);
  if(request.method==='POST')await assertMarketOpen(data.league.id);
  const snapshot={},allPlayers=await prices(db,data.league.pool,data.league.settings.points,snapshot),live=snapshot.live;
  return reply(await clauseRoute({db,league:data.league,uid,now:currentTime,
    action:clause[2],method:request.method,readBody:()=>body(request),
    ownershipId:url.searchParams.get('ownershipId'),players:allPlayers,
    schedule:live.schedule,getNow:clock,
    canPlay:async target=>!!await db.prepare('SELECT 1 FROM fantasy_participant_teams WHERE uid=? AND team_id=?').bind(target,data.league.teamId).first()
  }));
 }
 const market=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})\/(market|roster|buy|bid|offers(?:\/[a-zA-Z0-9-]{1,80}\/(?:accept|reject|cancel))?)$/);if(market){const data=await detail(db,market[1],uid,currentTime,await allowedTeams());await ensureManager(db,data.league,uid);if(request.method==='POST'&&!/\/reject$|\/cancel$/.test(market[2]))await assertMarketOpen(data.league.id);const result=await marketRoute({db,league:data.league,uid,now:currentTime,action:market[2],method:request.method,readBody:()=>body(request),players:await prices(db,data.league.pool,data.league.settings.points),getNow:clock,catalogVersion:catalog.version+'-actas-30-v2',canPlay:async target=>!!await db.prepare('SELECT 1 FROM fantasy_participant_teams WHERE uid=? AND team_id=?').bind(target,data.league.teamId).first()});if((market[2]==='offers'||/^offers\/[^/]+\/(accept|reject)$/.test(market[2]))&&request.method==='POST')ctx?.waitUntil?.(dispatchOfferNotifications(env).catch(()=>{}));if(request.method==='GET'&&market[2]==='market'){const gameListings=(await db.prepare("SELECT m.* FROM fantasy_manager_listings m JOIN fantasy_market_listings l ON l.id=m.listing_id JOIN fantasy_roster r ON r.id=m.ownership_id AND r.uid=m.uid AND r.league_id=m.league_id WHERE m.league_id=? AND m.uid=? AND l.retired_day IS NULL AND m.expires_at>?").bind(data.league.id,uid,currentTime).all()).results;const gameOffers=gameListings.flatMap(m=>{const p=result.roster.find(p=>p.id===m.player_id&&p.mine);const q=gameOfferForListing(m,p,currentTime);return q?[{id:'game-'+m.listing_id+'-'+q.day,playerId:m.player_id,playerName:p.name,amount:q.amountCents/100,buyer:'Fantasy · Mercado',seller:'Tú',incoming:true,status:'pending',expiresAt:q.expiresAt,gameOffer:true,listingId:m.listing_id,ownershipId:m.ownership_id,day:q.day,amountCents:q.amountCents}]:[]});result.offers=[...gameOffers,...result.offers];const dates=await db.prepare('SELECT start_day AS startDay,end_day AS endDay FROM fantasy_market_windows WHERE league_id=?').bind(data.league.id).first();return reply({...result,marketWindow:{startDate:marketWindowPolicy.label(dates?.startDay),endDate:marketWindowPolicy.label(dates?.endDay),open:marketWindowPolicy.isOpen(dates,currentTime)}})}return reply(result)}
 const match=path.match(/^\/api\/fantasy\/leagues\/([a-zA-Z0-9-]{1,80})(\/players)?$/);if(match&&request.method==='GET'){const data=await detail(db,match[1],uid,currentTime,await allowedTeams());if(match[2]){const snapshot={},[players,owners]=await Promise.all([prices(db,data.league.pool,data.league.settings.points,snapshot),playerOwnership(db,match[1],uid)]);return reply({players:players.map(p=>({...p,...(owners.get(p.id)||{ownershipId:null,owner:null,mine:false})})),finance:data.league.finance,weeklyEleven:weeklyEleven(players,snapshot.live.matches,snapshot.awards,data.league.settings.points,currentTime),version:catalog.version,updatedAt:catalog.updatedAt})}return reply(data)}
 return reply({error:'Apartado no disponible.'},404);
 }catch(e){
 const operationErrors={
  FANTASY_LOAN_PLAYER_LOCKED:'Un jugador cedido no se puede vender ni traspasar.',
  FANTASY_LOAN_BORROWER_MIN:'Debes conservar suficientes jugadores para devolver las cesiones y mantener al menos 12.',
  FANTASY_LOAN_RESERVED_SLOT:'Debes reservar una plaza para recuperar a los jugadores que has cedido.',
  FANTASY_LINEUPS_LOCKED:'Las alineaciones están bloqueadas por el administrador de esta liga.',
  FANTASY_ROSTER_MIN:'Tu plantilla debe conservar al menos 12 jugadores.',
  FANTASY_ROSTER_MAX:'La plantilla de destino ya tiene 16 jugadores.'
 };
 const operationCode=Object.keys(operationErrors).find(code=>String(e.message).includes(code));
 if(operationCode)return reply({error:operationErrors[operationCode]},409);
 if(/FANTASY_GIFT_CHANGED|fantasy_award_changes|fantasy_coach_changes|fantasy_roster.league_id, fantasy_roster.player_id/.test(e.message))return reply({error:'La elección o el reparto cambiaron en otro dispositivo. Actualiza y vuelve a elegir.'},409);if(/FANTASY_FULL/.test(e.message))return reply({error:'La liga ya está completa.'},409);if(/FANTASY_LEAGUE_INACTIVE/.test(e.message))return reply({error:'La liga está pausada o archivada. No se permiten nuevas operaciones.'},409);if(/FANTASY_PLAYER_BLOCKED/.test(e.message))return reply({error:'El Club ha bloqueado nuevos fichajes de este jugador en esta liga.'},409);if(/FANTASY_MARKET_BIDS_ACTIVE/.test(e.message))return reply({error:'No se puede reducir el mercado mientras hay pujas activas. Espera al cierre.'},409);return reply({error:e.status?e.message:'No se pudo guardar o consultar la liga. Vuelve a intentarlo.'},e.status||503)}
}
