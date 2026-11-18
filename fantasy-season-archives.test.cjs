const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {readFileSync}=require('node:fs');
let validSeason;
before(async()=>{({validSeason}=await import('./fantasy-seasons.mjs'))});
test('solo permite temporadas deportivas correctas',()=>{
 assert.equal(validSeason('2026/27'),true);
 assert.equal(validSeason('2025/26'),true);
 assert.equal(validSeason('2026/28'),false);
 assert.equal(validSeason('2026-27'),false);
 assert.equal(validSeason('../../x'),false);
});
test('históricos permanentes por liga y temporada no pueden sobrescribirse accidentalmente',()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  sql.exec("CREATE TABLE fantasy_leagues(id TEXT PRIMARY KEY);INSERT INTO fantasy_leagues VALUES('liga');");
  sql.exec(readFileSync('fantasy-seasons-schema.sql','utf8'));
  sql.prepare('INSERT INTO fantasy_season_archives VALUES(?,?,?,?,?,?)').run('liga','2026/27','[]','[]',100,'admin');
  assert.throws(()=>sql.prepare('INSERT INTO fantasy_season_archives VALUES(?,?,?,?,?,?)').run('liga','2026/27','[]','[]',101,'admin'),/UNIQUE/);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM fantasy_season_archives WHERE league_id='liga'").get().n,1);
  assert.equal(sql.prepare("SELECT closed_at FROM fantasy_season_archives WHERE league_id='liga' AND season='2026/27'").get().closed_at,100);
 }finally{sql.close()}
});
test('reinicio conserva archivos y elimina primero contratos de préstamos',()=>{
 const code=readFileSync('fantasy-league-reset.mjs','utf8');
 assert.match(code,/fantasy_season_archives/);
 assert.match(code,/dependencies\.get\('fantasy_player_loans'\)\.add\('fantasy_roster'\)/);
});
