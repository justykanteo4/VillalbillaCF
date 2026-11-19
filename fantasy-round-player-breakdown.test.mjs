import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import bundled from './fantasy-sports.json' with {type:'json'};
import {roundPlayerBreakdown} from './fantasy-round-player-breakdown.mjs';
import {leagueStandings} from './fantasy-game.mjs';
import {classicSettings} from './fantasy-leagues.cjs';
function fixture(t){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`
 CREATE TABLE fantasy_members(league_id TEXT,uid TEXT,nickname TEXT,PRIMARY KEY(league_id,uid));
 CREATE TABLE fantasy_lineups(league_id TEXT,uid TEXT,week INTEGER,players_json TEXT,captain_id TEXT);
 CREATE TABLE fantasy_coach_contracts(league_id TEXT,uid TEXT,coach_id TEXT,starts_at INTEGER,ends_at INTEGER);
 CREATE TABLE fantasy_awards(week INTEGER,match_id TEXT,team_id TEXT,player_id TEXT,kind TEXT);
 CREATE TABLE fantasy_special_rounds(league_id TEXT,week INTEGER,multiplier INTEGER);
 CREATE TABLE fantasy_player_positions(player_id TEXT,position TEXT);
 CREATE TABLE fantasy_team_photos(league_id TEXT,uid TEXT,photo_data TEXT);
 CREATE TABLE fantasy_team_photo_privacy(league_id TEXT,uid TEXT,visible INTEGER);
 CREATE TABLE fantasy_live_matches(payload TEXT,updated_at INTEGER);
 CREATE TABLE fantasy_live_schedule(id INTEGER,payload TEXT);
 CREATE TABLE fantasy_original_schedule(id INTEGER,payload TEXT);
 INSERT INTO fantasy_members VALUES('liga','manager-a','Equipo A'),('liga','manager-b','Equipo B');
 `);
 t.after(()=>sql.close());
 const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),first:async()=>sql.prepare(query).get(...args),all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}})});
 const db={prepare};
 const league={id:'liga',settings:{points:classicSettings.points},createdAt:0};
 return {sql,db,league};
}
test('desglose de Jornada suma exactamente lo mismo que la clasificación, con capitanes y jornadas especiales',async t=>{
 const f=fixture(t);
 const m=bundled.matches.find(m=>m.players.filter(p=>p.played).length>=11);
 assert.ok(m,'El fixture necesita un acta con once futbolistas');
 const selected=m.players.filter(p=>p.played).slice(0,11).map(p=>p.id);
 f.sql.prepare('INSERT INTO fantasy_lineups VALUES(?,?,?,?,?)').run('liga','manager-a',m.week,JSON.stringify(selected),selected[0]);
 f.sql.prepare('INSERT INTO fantasy_special_rounds VALUES(?,?,?)').run('liga',m.week,2);
 f.sql.prepare('INSERT INTO fantasy_player_positions VALUES(?,?)').run(selected[1],'Defensa');
 const now=Date.parse('2026-11-19T12:00:00Z');
 const b=await roundPlayerBreakdown(f.db,f.league,'manager-a',m.week,now);
 const table=await leagueStandings(f.db,f.league,now);
 const expected=table.rows.find(r=>r.uid==='manager-a')?.rounds.find(r=>r.week===m.week);
 assert.ok(expected);
 assert.equal(b.total,expected.points);
 assert.equal(b.players.length,11);
 assert.equal(b.players.reduce((sum,p)=>sum+p.points,0)+b.coaches.reduce((sum,p)=>sum+p.points,0),b.total);
 assert.equal(b.players.filter(p=>p.captain).length,1);
 assert.equal(b.players.find(p=>p.playerId===selected[1]).position,'Defensa');
});
test('no permite consultar participantes ajenos y no muestra puntos de partidos futuros',async t=>{
 const f=fixture(t),m=bundled.matches.find(m=>m.players.filter(p=>p.played).length>=11);
 await assert.rejects(roundPlayerBreakdown(f.db,f.league,'externo',m.week,Date.now()),error=>error.status===404);
 const selected=m.players.filter(p=>p.played).slice(0,11).map(p=>p.id);
 f.sql.prepare('INSERT INTO fantasy_lineups VALUES(?,?,?,?,?)').run('liga','manager-a',m.week,JSON.stringify(selected),selected[0]);
 const result=await roundPlayerBreakdown(f.db,f.league,'manager-a',m.week,0);
 assert.equal(result.total,0);
 assert.ok(result.players.every(p=>p.points===0));
 await assert.rejects(roundPlayerBreakdown(f.db,f.league,'manager-a',-1,Date.now()),error=>error.status===400);
});
