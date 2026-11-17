// Runs ONLY on an ephemeral SQL export, never against a remote D1 binding.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resetLeague} from '../fantasy-league-reset.mjs';
const file=process.argv[2];
if(!file||!file.includes('fantasy-reset-snapshot'))throw Error('Snapshot path required; refusing to run without a copy.');
const sql=new DatabaseSync(':memory:');
try{
 sql.exec(readFileSync(file,'utf8'));
 sql.exec('PRAGMA foreign_keys=ON;');
 const league=sql.prepare('SELECT id,name,created_at FROM fantasy_leagues ORDER BY created_at DESC LIMIT 1').get();
 if(!league)throw Error('No sample league in production copy; unable to verify reset.');
 const beforeLeagues=sql.prepare('SELECT COUNT(*) n FROM fantasy_leagues').get().n;
 const beforeMembers=sql.prepare('SELECT COUNT(*) n FROM fantasy_members').get().n;
 const beforeOther=sql.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id!=?').get(league.id).n;
 const prepare=(q,args=[])=>({bind:(...values)=>prepare(q,values),first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)}),run:async()=>sql.prepare(q).run(...args)});
 const db={prepare,batch:async statements=>{sql.exec('BEGIN');try{let result=[];for(const statement of statements)result.push(await statement.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 const preview=await resetLeague({db,leagueId:league.id});
 assert.equal(preview.name,league.name);
 const now=Math.max(Date.now(),league.created_at+1000);
 await resetLeague({db,leagueId:league.id,confirm:'REINICIAR '+league.name,expectedCreatedAt:league.created_at,now,apply:true});
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_leagues').get().n,beforeLeagues);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_members').get().n,beforeMembers);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id!=?').get(league.id).n,beforeOther);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM fantasy_roster WHERE league_id=?').get(league.id).n,0);
 const fk=sql.prepare('PRAGMA foreign_key_check').all();
 if(fk.length)throw Error('Foreign key violations after reset on copied database: '+fk.length);
 console.log('Reinicio ensayado con éxito en copia temporal. No se alteró producción.');
}finally{sql.close()}
