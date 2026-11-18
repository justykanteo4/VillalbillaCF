import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {loanRoute,settleExpiredLoans} from './fantasy-loans.mjs';
import {exchangeRoute} from './fantasy-exchanges.mjs';

function fixture(t){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`
 CREATE TABLE fantasy_leagues(id TEXT PRIMARY KEY,settings_json TEXT NOT NULL DEFAULT '{}');
 CREATE TABLE fantasy_members(league_id TEXT,uid TEXT,nickname TEXT,PRIMARY KEY(league_id,uid));
 CREATE TABLE fantasy_managers(league_id TEXT,uid TEXT,PRIMARY KEY(league_id,uid));
 CREATE TABLE fantasy_league_lifecycle(league_id TEXT PRIMARY KEY,state TEXT);
 CREATE TABLE fantasy_roster(id TEXT PRIMARY KEY,league_id TEXT,uid TEXT,player_id TEXT,acquired_at INTEGER,price_units INTEGER,UNIQUE(league_id,uid,player_id));
 CREATE UNIQUE INDEX roster_unique_player ON fantasy_roster(league_id,player_id);
 CREATE TABLE fantasy_market_listings(id TEXT PRIMARY KEY,league_id TEXT,player_id TEXT,retired_day INTEGER);
 CREATE TABLE fantasy_offers(id TEXT PRIMARY KEY,league_id TEXT,ownership_id TEXT,status TEXT);
 CREATE TABLE fantasy_lineups(league_id TEXT,uid TEXT,players_json TEXT,captain_id TEXT,revision INTEGER,deadline_at INTEGER);
 INSERT INTO fantasy_leagues VALUES('league','{}');
 INSERT INTO fantasy_members VALUES('league','a','A'),('league','b','B');
 INSERT INTO fantasy_managers VALUES('league','a'),('league','b');
 `);
 for(const uid of ['a','b'])for(let i=0;i<14;i++)sql.prepare('INSERT INTO fantasy_roster VALUES(?,?,?,?,?,?)').run(uid+i,'league',uid,uid+'player'+i,10,10);
 sql.exec(readFileSync('fantasy-exchanges-schema.sql','utf8'));
 sql.exec(readFileSync('fantasy-loans-schema.sql','utf8'));
 t.after(()=>sql.close());
 const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),first:async()=>sql.prepare(query).get(...args),all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}})});
 const db={prepare},league={id:'league'};
 const loan=(uid,action='',method='GET',value={},now=1000)=>loanRoute({db,league,uid,method,action,readBody:async()=>value,now,canPlay:async()=>true});
 const exchange=(uid,action='',method='GET',value={},now=1000)=>exchangeRoute({db,league,uid,method,action,readBody:async()=>value,now,canPlay:async()=>true});
 const owner=id=>sql.prepare('SELECT uid FROM fantasy_roster WHERE id=?').get(id)?.uid;
 const count=uid=>sql.prepare('SELECT COUNT(*) AS n FROM fantasy_roster WHERE league_id=? AND uid=?').get('league',uid).n;
 return {sql,db,loan,exchange,owner,count};
}

test('no se puede cambiar un jugador mientras está prestado; tras volver, sí',async t=>{
 const f=fixture(t);
 const loan=await f.loan('a','','POST',{ownershipId:'a0',borrowerUid:'b',weeks:1,requestId:'loan-000001'});
 await f.loan('b',loan.id+'/accept','POST',{},1100);
 assert.equal(f.owner('a0'),'b');
 const proposed=await f.exchange('b','','POST',{myOwnershipId:'a0',rivalOwnershipId:'a1',requestId:'trade-000001'},1200);
 await assert.rejects(f.exchange('a',proposed.id+'/accept','POST',{},1300),/FANTASY_LOAN_PLAYER_LOCKED/);
 assert.equal(f.owner('a0'),'b');
 assert.equal(f.owner('a1'),'a');
 assert.equal(f.sql.prepare('SELECT status FROM fantasy_player_exchanges WHERE id=?').get(proposed.id).status,'pending');
 const settled=await settleExpiredLoans(f.db,1100+604800001);
 assert.equal(settled.returned,1);
 assert.equal(f.owner('a0'),'a');
 const fresh=await f.exchange('a','','POST',{myOwnershipId:'a0',rivalOwnershipId:'b0',requestId:'trade-000002'},1100+604800002);
 await f.exchange('b',fresh.id+'/accept','POST',{},1100+604800003);
 assert.equal(f.owner('a0'),'b');
 assert.equal(f.owner('b0'),'a');
 assert.equal(f.count('a'),14);
 assert.equal(f.count('b'),14);
});

test('la devolución automática conserva ambos cupos y las jornadas cerradas',async t=>{
 const f=fixture(t);
 f.sql.prepare('INSERT INTO fantasy_lineups VALUES(?,?,?,?,?,?)').run('league','a',JSON.stringify(['aplayer0']),'aplayer0',1,500);
 f.sql.prepare('INSERT INTO fantasy_lineups VALUES(?,?,?,?,?,?)').run('league','a',JSON.stringify(['aplayer0']),'aplayer0',1,2000000000);
 const proposal=await f.loan('a','','POST',{ownershipId:'a0',borrowerUid:'b',weeks:1,requestId:'loan-000002'});
 await f.loan('b',proposal.id+'/accept','POST',{},1100);
 assert.deepEqual(JSON.parse(f.sql.prepare('SELECT players_json FROM fantasy_lineups WHERE deadline_at=500').get().players_json),['aplayer0']);
 assert.deepEqual(JSON.parse(f.sql.prepare('SELECT players_json FROM fantasy_lineups WHERE deadline_at=2000000000').get().players_json),[]);
 const result=await settleExpiredLoans(f.db,1100+604800001);
 assert.deepEqual(result,{returned:1,blocked:0});
 assert.equal(f.count('a'),14);
 assert.equal(f.count('b'),14);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM fantasy_player_loans WHERE status=?').get('active').n,0);
});

test('en una liga pausada no se pueden proponer préstamos o intercambios nuevos',async t=>{
 const f=fixture(t);
 f.sql.prepare("INSERT INTO fantasy_league_lifecycle VALUES('league','paused')").run();
 await assert.rejects(f.loan('a','','POST',{ownershipId:'a0',borrowerUid:'b',weeks:1,requestId:'loan-000003'}),/pausada/i);
 await assert.rejects(f.exchange('a','','POST',{myOwnershipId:'a0',rivalOwnershipId:'b0',requestId:'trade-000003'}),/pausada/i);
 assert.equal(f.owner('a0'),'a');
 assert.equal(f.owner('b0'),'b');
});
