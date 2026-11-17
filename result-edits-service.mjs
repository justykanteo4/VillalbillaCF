import {decodeJwt} from 'jose';
import {verifyAdmin} from './free-notifications.mjs';
import teams from './teams.json' with {type:'json'};
import news from './server/news.cjs';
const fail=(message,status=400)=>Object.assign(Error(message),{status}),reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const publicEdit=row=>row?.active?{homeScore:row.home_score,awayScore:row.away_score,scoreOverride:{revision:row.revision,updatedAt:row.updated_at},scoreOverrideRevision:row.revision}:null;
export async function overlayResultEdits(value,path,db){
 if(!db||!['/api/news','/api/team-calendar'].includes(path)||!value||value.error)return value;
 const {results}=await db.prepare('SELECT match_id,home_score,away_score,active,revision,updated_at FROM result_edits').all(),byId=new Map(results.map(row=>[row.match_id,row]));
 const apply=match=>{const row=byId.get(String(match.id)),edit=publicEdit(row);return edit?{...match,...edit,comment:undefined}:row?{...match,scoreOverride:null,scoreOverrideRevision:row.revision}:match};
 if(path==='/api/news')return {...value,teams:value.teams.map(team=>({...team,fixtures:(team.fixtures||[]).map(apply)}))};
 if(path==='/api/team-calendar')return {...value,fixtures:(value.fixtures||[]).map(apply)};
 return apply(value);
}
export async function handleResultEdits(request,env,{authorize=verifyAdmin,loadTeam=id=>news.teamCalendar(id,false,{db:env.VISITS_DB}),actor=()=>decodeJwt(request.headers.get('Authorization').slice(7)),clock=Date.now}={}){
 const url=new URL(request.url);if(url.pathname!=='/api/admin/result-edits')return null;
 try{
  if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
  const uid=await authorize(request,env),db=env.VISITS_DB;if(!db)throw fail('Servicio no disponible.',503);
  let value;if(request.method==='POST'){const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw fail('Origen no permitido.',403);const raw=await request.text();if(raw.length>1500)throw fail('Solicitud demasiado grande.',413);try{value=JSON.parse(raw)}catch{throw fail('Datos no válidos.')}}else value={teamId:url.searchParams.get('team'),matchId:url.searchParams.get('match')};
  const {teamId,matchId}=value||{};if(!teams.some(t=>t.id===teamId)||!/^\d{1,20}$/.test(matchId||''))throw fail('Partido no válido.');
  let current=await db.prepare('SELECT * FROM result_edits WHERE match_id=?').bind(matchId).first();
  if(request.method==='POST'){
   const {homeScore,awayScore,revision,restore=false}=value;if(!Number.isSafeInteger(revision)||revision<0||typeof restore!=='boolean'||!restore&&(!Number.isInteger(homeScore)||homeScore<0||homeScore>99||!Number.isInteger(awayScore)||awayScore<0||awayScore>99))throw fail('Introduce goles enteros entre 0 y 99.');
   if((current?.revision||0)!==revision)throw fail('Otro administrador ha cambiado el resultado. Actualiza antes de guardar.',409);
   const calendar=await loadTeam(teamId),fixture=calendar?.fixtures?.find(m=>String(m.id)===matchId);if(!fixture||calendar.error)throw fail('No se pudo confirmar este partido en el calendario.',404);
   const claims=actor(),at=clock(),next=revision+1,id=crypto.randomUUID(),home=restore?null:homeScore,away=restore?null:awayScore;
   const results=await db.batch([
    db.prepare('INSERT INTO result_edits(match_id,team_id,home_score,away_score,active,revision,updated_at,change_id) SELECT ?,?,?,?,?,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM result_edits WHERE match_id=? AND revision=?) ON CONFLICT(match_id) DO UPDATE SET team_id=excluded.team_id,home_score=excluded.home_score,away_score=excluded.away_score,active=excluded.active,revision=result_edits.revision+1,updated_at=excluded.updated_at,change_id=excluded.change_id WHERE result_edits.revision=?').bind(matchId,teamId,home,away,restore?0:1,next,at,id,revision,matchId,revision,revision),
    db.prepare('INSERT INTO result_edit_history(id,match_id,team_id,revision,home_score,away_score,previous_home,previous_away,action,actor_uid,actor_email,actor_name,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM result_edits WHERE match_id=? AND revision=? AND change_id=?)').bind(id,matchId,teamId,next,home,away,current?.active?current.home_score:fixture.homeScore,current?.active?current.away_score:fixture.awayScore,restore?'restore':'edit',uid,String(claims.email||''),String(claims.name||claims.email||uid),at,matchId,next,id)
   ]);
   if(!results[0].meta?.changes)throw fail('Otro administrador ha cambiado el resultado. Actualiza antes de guardar.',409);
   current=await db.prepare('SELECT * FROM result_edits WHERE match_id=?').bind(matchId).first();
   const history=await db.prepare('SELECT * FROM result_edit_history WHERE match_id=? ORDER BY revision DESC LIMIT 30').bind(matchId).all();return reply({revision:current.revision,active:!!current.active,fixture:{...fixture,...(publicEdit(current)||{scoreOverride:null,scoreOverrideRevision:current.revision})},history:history.results});
  }
  const history=await db.prepare('SELECT * FROM result_edit_history WHERE match_id=? ORDER BY revision DESC LIMIT 30').bind(matchId).all();return reply({revision:current?.revision||0,active:!!current?.active,edit:publicEdit(current),history:history.results});
 }catch(e){return reply({error:e.status?e.message:'No se pudo guardar o consultar el resultado.'},e.status||503)}
}
