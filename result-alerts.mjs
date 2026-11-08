import teams from './teams.json' with {type:'json'};
import calendarSeed from './news-seed.json' with {type:'json'};
import baseline from './result-alert-baseline.json' with {type:'json'};
import news from './server/news.cjs';
import matches from './server/match.cjs';
import {queueNotice,FREE_LIMITS} from './free-notifications.mjs';
import resultNames from './result-dates.cjs';
const known=new Set(baseline),ids=new Set(teams.map(t=>t.id));
const score=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:typeof v==='string'&&/^\d+$/.test(v)?Number(v):null;
export function confirmedResult(team,fixture,report,today){const age=(Date.parse(today+'T12:00:00Z')-Date.parse(fixture.date+'T12:00:00Z'))/86400000;if(!Number.isFinite(age)||age<0||age>2||!report||report.error||report.closed!==true||String(report.id)!==String(fixture.id)||String(report.homeId)!==String(fixture.homeId)||String(report.awayId)!==String(fixture.awayId)||![fixture.homeId,fixture.awayId].map(String).includes(team.id))return null;const home=score(report.homeScore),away=score(report.awayScore);return home===null||away===null?null:{home,away}}
export async function publishResult(env,team,fixture,report,{now=Date.now(),today=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'})}={}){
 const result=confirmedResult(team,fixture,report,today);if(!result||known.has(String(fixture.id)))return {queued:false};
 const db=env.NOTIFICATIONS_DB,id='auto-result-'+fixture.id,teamIds=[fixture.homeId,fixture.awayId].map(String).filter(id=>ids.has(id)),destination={type:'match',teamId:team.id,matchId:String(fixture.id)},home=resultNames.resultTeamName(fixture.home,fixture.homeId,team),away=resultNames.resultTeamName(fixture.away,fixture.awayId,team),title='Resultado · '+resultNames.resultTeamName(team.name,team.id,team),body=home+' '+result.home+' — '+result.away+' '+away;
 const saved=await db.prepare('INSERT OR IGNORE INTO club_notices(id,title,body,all_club,team_ids,player_ids,created_by,created_at,destination) SELECT ?,?,?,0,?,?,?, ?,? WHERE (SELECT count(*) FROM club_notices WHERE created_at>=?)<?').bind(id,title,body,JSON.stringify(teamIds),'[]','automatic-results',now,JSON.stringify(destination),now-86400000,FREE_LIMITS.noticesPerDay).run();
 if(!saved.meta?.changes)return {queued:false};await queueNotice(db,id);return {queued:true,id};
}
export async function scheduledResults(env,{now=Date.now(),loadTeam=(id)=>news.teamCalendar(id,true,{db:env.VISITS_DB}),loadReport=(team,fixture)=>matches.matchFixtureDetails(team.id,fixture,team.id,{db:env.VISITS_DB})}={}){
 const db=env.NOTIFICATIONS_DB;if(!db)return;const today=new Date(now).toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});let rows;try{rows=(await db.prepare('SELECT * FROM result_checks').all()).results}catch{return}
 const state=new Map(rows.map(r=>[r.team_id,r]));const priority=team=>{const fixtures=calendarSeed.teams.find(t=>t.id===team.id)?.fixtures||[];return fixtures.some(m=>m.date===today)?0:fixtures.some(m=>m.date&&m.date<today&&Date.parse(today)-Date.parse(m.date)<=2*86400000)?1:2};
 const team=teams.filter(t=>(state.get(t.id)?.next_at||0)<=now&&(state.get(t.id)?.lease_until||0)<=now).sort((a,b)=>(state.get(a.id)?.checked_at||0)-(state.get(b.id)?.checked_at||0)||priority(a)-priority(b))[0];if(!team)return;
 const claim=await db.prepare('INSERT INTO result_checks(team_id,lease_until) VALUES(?,?) ON CONFLICT(team_id) DO UPDATE SET lease_until=excluded.lease_until WHERE result_checks.lease_until<=? AND result_checks.next_at<=?').bind(team.id,now+120000,now,now).run();if(!claim.meta?.changes)return;
 try{const data=await loadTeam(team.id);if(data?.error||!Array.isArray(data?.fixtures))throw Error('SOURCE');const notices=await db.prepare("SELECT id FROM club_notices WHERE created_by='automatic-results' AND created_at>=?").bind(now-3*86400000).all(),notified=new Set(notices.results.map(r=>r.id));const recent=data.fixtures.filter(m=>m.date&&m.date<=today&&Date.parse(today)-Date.parse(m.date)<=2*86400000),pending=recent.filter(m=>!known.has(String(m.id))&&!notified.has('auto-result-'+m.id));let open=pending.length>2;for(const fixture of pending.slice(0,2)){const report=await loadReport(team,fixture);if(!confirmedResult(team,fixture,report,today)){open=true;continue}await publishResult(env,team,fixture,report,{now,today})}await db.prepare('UPDATE result_checks SET checked_at=?,next_at=?,lease_until=0,last_error=NULL WHERE team_id=?').bind(now,now+(open?120000:recent.length?900000:3600000),team.id).run();return {teamId:team.id,checked:pending.slice(0,2).length}}
 catch{await db.prepare("UPDATE result_checks SET checked_at=?,next_at=?,lease_until=0,last_error='SOURCE' WHERE team_id=?").bind(now,now+120000,team.id).run();return {teamId:team.id,error:true}}
}
