import {settleWeeklyPrizes} from './fantasy-weekly-prizes.mjs';
import {settleIdealCash} from './fantasy-ideal-cash.mjs';
import {sports} from './fantasy-game.mjs';
import {roundClosure} from './fantasy-round-closure.cjs';
import {weekKey} from './fantasy-game-policy.cjs';
import {economyPolicy} from './fantasy-economy.mjs';
import teams from './teams.json' with {type:'json'};
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const all=async q=>(await q.all()).results;
const active="COALESCE(x.state,'active')='active'";
export async function paymentAdmin(db,method,readBody,url,now){
 if(!db)throw fail('Base de datos no disponible.',503);
 if(!['GET','POST'].includes(method))throw fail('Método no permitido.',405);
 const value=method==='POST'?await readBody():null,id=method==='POST'?value?.leagueId:url.searchParams.get('leagueId');
 if(method==='POST'&&(value?.confirm!==true||typeof id!=='string'||!id))throw fail('Selecciona y confirma una liga.');
 const leagues=await all(db.prepare("SELECT l.id,l.name,l.created_at AS createdAt,(SELECT COUNT(*) FROM fantasy_managers m WHERE m.league_id=l.id) AS managers FROM fantasy_leagues l LEFT JOIN fantasy_league_lifecycle x ON x.league_id=l.id WHERE "+active+" ORDER BY l.name"));
 if(!id)return {leagues};
 const league=leagues.find(l=>l.id===id);if(!league)throw fail('Liga activa no encontrada.',404);
 const required=['fantasy_prize_first','fantasy_prize_adjust','fantasy_prize_credit','fantasy_ideal_first','fantasy_ideal_adjust','fantasy_ideal_credit'];
 const triggers=await all(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'"));
 const errors=required.filter(n=>!triggers.some(t=>t.name===n)).map(n=>'Falta el mecanismo de pago '+n);
 const missing=await db.prepare("SELECT COUNT(*) AS n FROM fantasy_managers m LEFT JOIN fantasy_wallet_cents w ON w.league_id=m.league_id AND w.uid=m.uid WHERE m.league_id=? AND w.uid IS NULL").bind(id).first();
 if(missing?.n)errors.push('Hay '+missing.n+' participantes sin monedero.');
 let outcome=null;
 if(method==='POST'){
  if(errors.length)throw fail('No se puede abonar: '+errors.join(' '),409);
  const results=await Promise.allSettled([settleWeeklyPrizes(db,id,now,{force:true}),settleIdealCash(db,id,now,{force:true})]);
  outcome=results.map((r,i)=>({kind:i?'once ideal':'jornada',state:r.status==='rejected'?'error':r.value?.busy?'busy':'ok'}));
 }
 const state=await db.prepare('SELECT status_json,next_at,lease_until FROM fantasy_prize_state WHERE league_id=?').bind(id).first();
 const s=await sports(db),awards=await all(db.prepare('SELECT * FROM fantasy_awards')),economy=await economyPolicy(db);
 const weeks=[...new Set(s.schedule.map(f=>f.week))].filter(w=>w>=economy.prizesFromWeek&&w<=weekKey(now)).sort((a,b)=>b-a);
 const saved=JSON.parse(state?.status_json||'[]'),rounds=weeks.map(week=>{
  const closure=roundClosure(week,s.schedule,s.matches,awards,now),fixtures=s.schedule.filter(f=>f.week===week),seen=new Set(fixtures.map(f=>f.teamId+':'+f.id)),games=[...fixtures,...s.matches.filter(m=>m.week===week&&m.startsAt<=now&&!seen.has(m.teamId+':'+m.id))];
  const blockers=games.flatMap(f=>{const match=s.matches.find(m=>m.week===week&&m.id===f.id&&m.teamId===f.teamId&&m.startsAt<=now);let reason=null;if(!match&&(!f.resultKnown||f.startsAt>now))reason='Resultado pendiente';else{const known=match&&(match.players.some(p=>typeof p.win==='boolean')||match.coaches?.some(p=>typeof p.win==='boolean')),win=known?match.players.some(p=>p.win)||match.coaches?.some(p=>p.win):f.resultWin;if(win&&!awards.some(a=>a.kind==='mvp'&&a.week===week&&a.match_id===f.id&&a.team_id===f.teamId))reason='MVP pendiente'}return reason?[{matchId:f.id,teamId:f.teamId,startsAt:f.startsAt,round:f.round,team:teams.find(t=>t.id===f.teamId)?.category||f.teamId,date:new Date(f.startsAt).toISOString().slice(0,10),reason}]:[]});
  return {week,status:saved.find(r=>r.week===week)?.status||'not-processed',ready:closure.ready,blockers};
 });
 const prizes=await all(db.prepare("SELECT p.week,m.nickname AS team,p.position,p.points,p.amount_cents AS amount,COALESCE((SELECT SUM(e.amount_cents) FROM fantasy_prize_events e WHERE e.league_id=p.league_id AND e.uid=p.uid AND e.week=p.week),0) AS credited FROM fantasy_weekly_prizes p JOIN fantasy_members m ON m.league_id=p.league_id AND m.uid=p.uid WHERE p.league_id=? ORDER BY p.week DESC,p.position,m.nickname LIMIT 500").bind(id));
 const history=await all(db.prepare("SELECT e.week,m.nickname AS team,e.amount_cents AS amount,e.kind,e.created_at AS at FROM fantasy_prize_events e LEFT JOIN fantasy_members m ON m.league_id=e.league_id AND m.uid=e.uid WHERE e.league_id=? ORDER BY e.id DESC LIMIT 50").bind(id));
 if(prizes.some(p=>p.amount!==p.credited))errors.push('Hay diferencias entre premios y movimientos. Revisar antes de modificar saldos manualmente.');
 return {leagues,league,rounds,prizes,history,errors,outcome,nextAt:state?.next_at||null,busy:(state?.lease_until||0)>now};
}
