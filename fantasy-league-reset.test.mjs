import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resetLeague} from './fantasy-league-reset.mjs';
import {handleFantasy} from './fantasy-service.mjs';
const files=['fantasy-schema.sql','social-schema.sql','fantasy-club-schema.sql','fantasy-actas-schema.sql','fantasy-access-schema.sql','fantasy-game-schema.sql','fantasy-rewards-schema.sql','fantasy-auction-schema.sql','fantasy-sales-schema.sql','fantasy-resale-schema.sql','fantasy-clause-schema.sql','fantasy-manager-listings-schema.sql','fantasy-league-lifecycle-schema.sql','fantasy-player-blocks-schema.sql','fantasy-market-window-schema.sql','fantasy-market-slot-schema.sql','fantasy-team-photo-privacy-schema.sql','fantasy-special-rounds-schema.sql'];
function fixture(t){
 const sql=new DatabaseSync(':memory:');
 for(const file of files)sql.exec(readFileSync(file,'utf8'));
 t.after(()=>sql.close());
 const prepare=(q,args=[])=>({bind:(...v)=>prepare(q,v),first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)}),run:()=>/^PRAGMA /i.test(q)?{results:sql.prepare(q).all(...args)}:({meta:{changes:Number(sql.prepare(q).run(...args).changes)}})});
 const db={prepare,batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}};
 const createdAt=Date.parse('2026-11-01T10:00:00Z');
 const add=(id,uid)=>{sql.prepare("INSERT INTO fantasy_leagues VALUES(?,?,?,?,?,?,?,?,?,?)").run(id,uid,id,'fingerprint','Liga '+id,'custom','{"type":"club"}','{"budget":52,"maxMembers":15}',id+'ABCDEFG',createdAt);sql.prepare("INSERT INTO fantasy_members VALUES(?,?,?,?)").run(id,uid,'Jugador '+uid,createdAt)};
 add('league-a','user-a');add('league-b','user-b');
 return {sql,db,createdAt};
}
test('reinicio requiere confirmacion exacta y mantiene otras ligas y miembros',async t=>{
 const {sql,db,createdAt}=fixture(t);
 sql.prepare("INSERT INTO fantasy_roster VALUES(?,?,?,?,?,?)").run('ownership-a','league-a','user-a','player-a',createdAt,25);
 sql.prepare("INSERT INTO fantasy_roster VALUES(?,?,?,?,?,?)").run('ownership-b','league-b','user-b','player-b',createdAt,25);
 sql.prepare("INSERT INTO fantasy_managers VALUES(?,?,?,?,?,?,?)").run('league-a','user-a','coach-a',createdAt,createdAt,createdAt,1);
 sql.prepare("INSERT INTO fantasy_managers VALUES(?,?,?,?,?,?,?)").run('league-b','user-b','coach-b',createdAt,createdAt,createdAt,1);
 sql.prepare("UPDATE fantasy_wallets SET delta_units=10 WHERE league_id='league-a'").run();
 const preview=await resetLeague({db,leagueId:'league-a'});
 assert.equal(preview.membersPreserved,1);
 assert.equal(preview.rowsToClear.fantasy_roster,1);
 await assert.rejects(()=>resetLeague({db,leagueId:'league-a',apply:true,confirm:'BORRAR',expectedCreatedAt:createdAt,now:createdAt+86400000}));
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM fantasy_roster WHERE league_id='league-a'").get().n,1);
 const done=await resetLeague({db,leagueId:'league-a',apply:true,confirm:'REINICIAR Liga league-a',expectedCreatedAt:createdAt,now:createdAt+86400000});
 assert.equal(done.reset,true);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM fantasy_roster WHERE league_id='league-a'").get().n,0);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM fantasy_managers WHERE league_id='league-a'").get().n,0);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM fantasy_roster WHERE league_id='league-b'").get().n,1);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM fantasy_members WHERE league_id='league-a'").get().n,1);
 assert.equal(sql.prepare("SELECT delta_units FROM fantasy_wallets WHERE league_id='league-a'").get().delta_units,0);
 assert.equal(sql.prepare("SELECT created_at FROM fantasy_leagues WHERE id='league-a'").get().created_at,createdAt+86400000);
});

test('API de reinicio bloquea usuarios normales y exige permisos del club',async t=>{
 const {db}=fixture(t),url='https://club.test/api/fantasy/admin/leagues/reset';
 const opts={authorize:async()=> 'user-a',getTeams:async()=>[]};
 const denied=await handleFantasy(new Request(url),{CHAT_DB:db},{...opts,adminAuthorize:async()=>{throw Object.assign(Error('Solo club'),{status:403})}});
 assert.equal(denied.status,403);
 const allowed=await handleFantasy(new Request(url),{CHAT_DB:db},{...opts,adminAuthorize:async()=> 'user-a'});
 assert.equal(allowed.status,200);
 const data=await allowed.json();
 assert.equal(data.leagues.length,2);
 const forged=new Request('https://club.test/api/fantasy/admin/leagues/league-a/reset',{method:'POST',headers:{Origin:'https://attacker.invalid'},body:JSON.stringify({confirmation:'REINICIAR Liga league-a',expectedCreatedAt:1})});
 const forbidden=await handleFantasy(forged,{CHAT_DB:db},{...opts,adminAuthorize:async()=> 'user-a'});
 assert.equal(forbidden.status,403);
});

test('vista previa consulta muchas tablas sin superar el límite de D1 gratuito ni borrar datos',async t=>{
 const {db,sql}=fixture(t);
 let calls=0,mutations=0;
 const meter={
  prepare(query){
   if(/sqlite_master|pragma_|PRAGMA|UNION/i.test(query))throw Error('La vista previa no debe consultar el esquema de tablas');
   const statement=db.prepare(query);
   return {bind(...args){const bound=statement.bind(...args);return wrap(bound)},
    first:async()=>{calls++;return statement.first()},
    all:async()=>{calls++;return statement.all()},
    run:async()=>{mutations++;throw Error('Preview must be read-only')}
   };
   function wrap(bound){return {
    first:async()=>{calls++;return bound.first()},
    all:async()=>{calls++;return bound.all()},
    run:async()=>{mutations++;throw Error('Preview must be read-only')}
   }}
  },
  batch:async()=>{mutations++;throw Error('Preview must not batch writes')}
 };
 const result=await resetLeague({db:meter,leagueId:'league-a'});
 assert.equal(result.membersPreserved,1);
 assert.equal(result.name,'Liga league-a');
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM fantasy_members WHERE league_id='league-a'").get().n,1);
 assert.equal(mutations,0);
 assert.equal(calls,3,'La vista previa usa tres lecturas de D1, independientemente del número de tablas');
});

test('reinicio omite borrados de tablas vacías y limita el tamaño de la transacción D1',async t=>{
 const {db,sql,createdAt}=fixture(t);
 let statementsSeen=0;
 const measured={...db,batch:async statements=>{
  statementsSeen=statements.length;
  return db.batch(statements);
 }};
 const done=await resetLeague({db:measured,leagueId:'league-a',apply:true,
  confirm:'REINICIAR Liga league-a',expectedCreatedAt:createdAt,now:createdAt+86400000});
 assert.equal(done.reset,true);
 assert(statementsSeen<=8,'Solo deben enviarse los cambios útiles a D1: '+statementsSeen);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM fantasy_members WHERE league_id='league-a'").get().n,1);
});
