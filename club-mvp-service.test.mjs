import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import sports from './fantasy-sports.json' with {type:'json'};
import {handleClubMvp} from './club-mvp-service.mjs';

const match=sports.matches.find(m=>m.players.filter(p=>p.win&&/^[0-9]{1,20}$/.test(String(p.id))).length>=4);
const winners=match.players.filter(p=>p.win).slice(0,4).map(p=>p.id);
const base='https://club.test';
function setup(t){
 const sql=new DatabaseSync(':memory:');
 t.after(()=>sql.close());
 sql.exec(`CREATE TABLE fantasy_live_matches(team_id TEXT,match_id TEXT,payload TEXT,updated_at INTEGER);
 CREATE TABLE fantasy_live_schedule(id INTEGER PRIMARY KEY,payload TEXT);
 CREATE TABLE fantasy_original_schedule(id INTEGER PRIMARY KEY,payload TEXT);
 CREATE TABLE fantasy_awards(match_id TEXT,team_id TEXT,week INTEGER,player_id TEXT,kind TEXT,PRIMARY KEY(match_id,team_id,player_id,kind));
 CREATE TABLE fantasy_award_changes(previous_revision INTEGER PRIMARY KEY,created_at INTEGER);
 CREATE TABLE fantasy_prize_state(next_at INTEGER,fingerprint TEXT);
 CREATE TABLE fantasy_ideal_reward_state(next_at INTEGER,fingerprint TEXT);`);
 const prepare=(q,params=[])=>({
  bind:(...args)=>prepare(q,args),
  first:async()=>sql.prepare(q).get(...params),
  all:async()=>({results:sql.prepare(q).all(...params)}),
  run:async()=>({meta:{changes:Number(sql.prepare(q).run(...params).changes)}})
 });
 const db={prepare,batch:async statements=>{
  sql.exec('BEGIN');
  try{const result=[];for(const statement of statements)result.push(await statement.run());sql.exec('COMMIT');return result}
  catch(e){sql.exec('ROLLBACK');throw e}
 }};
 const env={CHAT_DB:db},actor={uid:'coach-real',name:'Entrenador real',role:'trainer'};
 const authorize=async(request,unused,teamId,options)=>{
  assert.equal(options.capability,'mvp');
  if(teamId!==match.teamId)throw Object.assign(Error('No autorizado'),{status:403});
  return actor;
 };
 const admin=async()=>actor.uid;
 const get=(team=match.teamId,id=match.id)=>new Request(base+'/api/club/mvp?team='+team+'&match='+id);
 const post=(data,origin)=>new Request(base+'/api/club/mvp',{method:'POST',headers:origin?{Origin:origin}:{},body:JSON.stringify({kind:'mvp',teamId:match.teamId,matchId:match.id,...data})});
 const call=(request,options={})=>handleClubMvp(request,env,{authorize,authorizeAdmin:admin,...options});
 return {sql,db,env,actor,authorize,get,post,call};
}
test('MVP: acceso por equipo y capacidad, lectura exclusivamente del partido solicitado',async t=>{
 const f=setup(t),r=await f.call(f.get());
 assert.equal(r.status,200);
 assert.equal(r.headers.get('Cache-Control'),'no-store');
 const data=await r.json();
 assert.equal(data.matches.length,1);
 assert.equal(data.matches[0].id,match.id);
 assert.equal(data.matches[0].teamId,match.teamId);
 assert(!JSON.stringify(data).includes('coach-real'));
 assert.equal((await f.call(f.get('otro-equipo'))).status,400);
 assert.equal((await f.call(f.get(match.teamId,''))).status,400);
 assert.equal((await f.call(f.get(),{authorize:async()=>{throw Object.assign(Error('Sin permiso'),{status:403})}})).status,403);
 assert.equal(await handleClubMvp(new Request(base+'/api/news'),f.env),null);
});
test('MVP: cambios auditados, uno o dos por partido, autor verificado y revisión concurrente',async t=>{
 const f=setup(t);
 const before=await (await f.call(f.get())).json();
 const revision=before.revision;
 assert.equal((await f.call(f.post({revision,playerIds:winners.slice(0,3)}))).status,400);
 assert.equal((await f.call(f.post({revision,playerIds:winners.slice(0,2)},'https://evil.test'))).status,403);
 assert.equal((await f.call(f.post({kind:'idealXI',revision,playerIds:winners}))).status,400);
 let r=await f.call(f.post({revision,playerIds:winners.slice(0,2),actor_uid:'forged',actor_name:'Falso'}));
 assert.equal(r.status,200,JSON.stringify(await r.clone().json()));
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM fantasy_awards WHERE kind='mvp' AND match_id=? AND team_id=?").get(match.id,match.teamId).n,2);
 const logged=f.sql.prepare('SELECT * FROM club_mvp_audit').get();
 assert.equal(logged.actor_uid,'coach-real');
 assert.equal(logged.actor_name,'Entrenador real');
 assert.equal(logged.actor_role,'trainer');
 assert.deepEqual(JSON.parse(logged.previous_player_ids),[]);
 assert.deepEqual(JSON.parse(logged.player_ids),winners.slice(0,2));
 assert.equal((await f.call(f.post({revision,playerIds:winners.slice(0,3)}))).status,409);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM club_mvp_audit').get().n,1);
 r=await f.call(f.post({revision:revision+1,playerIds:winners.slice(0,1)}));
 assert.equal(r.status,200);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM club_mvp_audit').get().n,2);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM fantasy_awards WHERE kind='mvp' AND match_id=?").get(match.id).n,1);
 r=await f.call(f.post({revision:revision+2,playerIds:[]}));
 assert.equal(r.status,200);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM fantasy_awards WHERE kind='mvp' AND match_id=?").get(match.id).n,0);
 const history=await f.call(new Request(base+'/api/admin/club-mvp-audit'));
 const rows=(await history.json()).history;
 assert.equal(rows.length,3);
 assert.equal(rows[0].actor_uid,'coach-real');
 assert.deepEqual(JSON.parse(rows[0].player_ids),[]);
 assert.equal((await f.call(new Request(base+'/api/admin/club-mvp-audit'),{authorizeAdmin:async()=>{throw Object.assign(Error('Solo admin'),{status:403})}})).status,403);
});
test('MVP: sin autorizacion el historial y los cambios no son accesibles',async t=>{
 const f=setup(t),deny={authorize:async()=>{throw Object.assign(Error('Prohibido'),{status:403})}};
 assert.equal((await f.call(f.get(),deny)).status,403);
 assert.equal((await f.call(f.post({revision:0,playerIds:winners.slice(0,2)}),undefined)).status,200);
 assert.equal((await f.call(f.post({revision:1,playerIds:winners.slice(0,2)}),deny)).status,403);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM club_mvp_audit').get().n,1);
});
