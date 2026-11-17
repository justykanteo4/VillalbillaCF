// Exercises a real-schema D1 export only inside disposable in-memory SQLite.
// NEVER connect to or mutate the live database.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resetLeague} from '../fantasy-league-reset.mjs';

const file=process.argv[2];
if(!file||!file.includes('fantasy-reset-snapshot'))throw Error('Snapshot path required; refusing to run without a copy.');
const dump=readFileSync(file,'utf8');
const listDb=new DatabaseSync(':memory:');
let leagues;
try {
 listDb.exec(dump);
 leagues=listDb.prepare('SELECT id FROM fantasy_leagues ORDER BY created_at DESC').all();
} finally {listDb.close()}
if(!leagues.length)throw Error('No sample league in production copy; unable to verify reset.');

for (const [index,{id}] of leagues.entries()) {
 const sql=new DatabaseSync(':memory:');
 try {
  sql.exec(dump);
  sql.exec('PRAGMA foreign_keys=ON;');
  const league=sql.prepare('SELECT id,name,created_at FROM fantasy_leagues WHERE id=?').get(id);
  const beforeLeagues=sql.prepare('SELECT COUNT(*) n FROM fantasy_leagues').get().n;
  const beforeMembers=sql.prepare('SELECT COUNT(*) n FROM fantasy_members').get().n;
  const beforeOther=sql.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id!=?').get(id).n;
  const prepare=(q,args=[])=>({bind:(...values)=>prepare(q,values),first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)}),run:async()=>sql.prepare(q).run(...args)});
  const db={prepare,batch:async statements=>{sql.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sql.exec('COMMIT');return result}catch(error){sql.exec('ROLLBACK');throw error}}};
  const preview=await resetLeague({db,leagueId:id});
  assert.equal(preview.name,league.name);
  const now=Math.max(Date.now(),league.created_at+1000);
  await resetLeague({db,leagueId:id,confirm:'REINICIAR '+league.name,expectedCreatedAt:league.created_at,now,apply:true});
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_leagues').get().n,beforeLeagues);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_members').get().n,beforeMembers);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id!=?').get(id).n,beforeOther);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id=?').get(id).n,0);
  const violations=sql.prepare('PRAGMA foreign_key_check').all();
  if(violations.length)throw Error('Foreign key violations on isolated copy: '+violations.length);
  console.log('Copia aislada: liga '+(index+1)+' de '+leagues.length+' ensayada correctamente. No se alteró producción.');
 } catch(error) {
  // Never print private row values or exported SQL in CI logs.
  throw Error('Reinicio en copia aislada falló para liga '+(index+1)+' de '+leagues.length+': '+error.message);
 } finally {sql.close()}
}
console.log('Todas las ligas ensayadas de forma aislada. No se ha alterado producción.');
