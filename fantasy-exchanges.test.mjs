import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {exchangeRoute} from './fantasy-exchanges.mjs';

function fixture(t){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`
 CREATE TABLE fantasy_leagues(id TEXT PRIMARY KEY);
 CREATE TABLE fantasy_members(league_id TEXT,uid TEXT,nickname TEXT,PRIMARY KEY(league_id,uid));
 CREATE TABLE fantasy_managers(league_id TEXT,uid TEXT,PRIMARY KEY(league_id,uid));
 CREATE TABLE fantasy_league_lifecycle(league_id TEXT PRIMARY KEY,state TEXT);
 CREATE TABLE fantasy_roster(id TEXT PRIMARY KEY,league_id TEXT,uid TEXT,player_id TEXT,acquired_at INTEGER,price_units INTEGER,UNIQUE(league_id,uid,player_id));
 CREATE UNIQUE INDEX fantasy_roster_unique_player ON fantasy_roster(league_id,player_id);
 CREATE TABLE fantasy_market_listings(id TEXT PRIMARY KEY,league_id TEXT,player_id TEXT,retired_day INTEGER);
 CREATE TABLE fantasy_offers(id TEXT PRIMARY KEY,league_id TEXT,ownership_id TEXT,status TEXT);
 CREATE TABLE fantasy_lineups(league_id TEXT,uid TEXT,players_json TEXT,captain_id TEXT,revision INTEGER,deadline_at INTEGER);
 INSERT INTO fantasy_leagues VALUES('liga');
 INSERT INTO fantasy_members VALUES('liga','a','A'),('liga','b','B');
 INSERT INTO fantasy_managers VALUES('liga','a'),('liga','b');
 INSERT INTO fantasy_roster VALUES('one','liga','a','p1',1,10),('two','liga','b','p2',1,10);
 INSERT INTO fantasy_offers VALUES('offer1','liga','one','pending'),('offer2','liga','two','pending');
 `);
 sql.exec(readFileSync('fantasy-exchanges-schema.sql','utf8'));
 t.after(()=>sql.close());
 const prepare=(q,args=[])=>({bind:(...v)=>prepare(q,v),first:async()=>sql.prepare(q).get(...args),all:async()=>({results:sql.prepare(q).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}})});
 const db={prepare},league={id:'liga'};
 const call=(uid,action='',method='GET',value={},now=100)=>exchangeRoute({db,league,uid,now,method,action,readBody:async()=>value,canPlay:async()=>true});
 const proposal={myOwnershipId:'one',rivalOwnershipId:'two',requestId:'exchange-key-001'};
 const owner=id=>sql.prepare('SELECT uid FROM fantasy_roster WHERE id=?').get(id)?.uid;
 return {sql,call,proposal,owner};
}

test('proponer es idempotente; solo el receptor puede aceptar y el intercambio es atómico',async t=>{
 const f=fixture(t);
 const first=await f.call('a','','POST',f.proposal),again=await f.call('a','','POST',f.proposal);
 assert.equal(first.id,again.id);
 assert.equal((await f.call('b')).exchanges.length,1);
 await assert.rejects(f.call('a',first.id+'/accept','POST'),/Intercambio no encontrado/);
 assert.equal(f.owner('one'),'a');
 assert.equal(f.owner('two'),'b');
 await f.call('b',first.id+'/accept','POST',{},101);
 assert.equal(f.owner('one'),'b');
 assert.equal(f.owner('two'),'a');
 assert.equal(f.sql.prepare('SELECT status FROM fantasy_offers WHERE id=?').get('offer1').status,'cancelled');
 assert.equal(f.sql.prepare('SELECT status FROM fantasy_offers WHERE id=?').get('offer2').status,'cancelled');
 assert.equal((await f.call('b',first.id+'/accept','POST')).saved,true);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM fantasy_player_exchanges').get().n,1);
});

test('no permite aceptar una propuesta si cambió la propiedad o si el futbolista está en el mercado',async t=>{
 const f=fixture(t);const p=await f.call('a','','POST',f.proposal);
 f.sql.prepare('UPDATE fantasy_roster SET uid=? WHERE id=?').run('a','two');
 await assert.rejects(f.call('b',p.id+'/accept','POST',{},101),/actualiza las plantillas/i);
 assert.equal(f.sql.prepare('SELECT status FROM fantasy_player_exchanges').get().status,'pending');
 f.sql.prepare('UPDATE fantasy_roster SET uid=? WHERE id=?').run('b','two');
 f.sql.prepare('INSERT INTO fantasy_market_listings VALUES(?,?,?,NULL)').run('listing','liga','p1');
 await assert.rejects(f.call('b',p.id+'/accept','POST',{},101),/mercado/i);
 assert.equal(f.owner('one'),'a');
});

test('rechazar, cancelar y caducar no cambian jugadores',async t=>{
 const f=fixture(t);const p=await f.call('a','','POST',f.proposal);
 await f.call('b',p.id+'/reject','POST');
 assert.equal(f.owner('one'),'a');
 await assert.rejects(f.call('b',p.id+'/accept','POST',{},101),/pendiente/i);
 const q=await f.call('a','','POST',{...f.proposal,requestId:'exchange-key-002'});
 await f.call('a',q.id+'/cancel','POST');
 assert.equal(f.owner('two'),'b');
 const expiry=await f.call('a','','POST',{...f.proposal,requestId:'exchange-key-003'});
 await assert.rejects(f.call('b',expiry.id+'/accept','POST',{},8*86400000),/pendiente/i);
});

test('respeta las alineaciones cerradas y quita del borrador al jugador intercambiado',async t=>{
 const f=fixture(t);
 for(const [uid,player] of [['a','p1'],['b','p2']]){
  f.sql.prepare('INSERT INTO fantasy_lineups VALUES(?,?,?,?,?,?)').run('liga',uid,JSON.stringify([player]),player,1,1000);
  f.sql.prepare('INSERT INTO fantasy_lineups VALUES(?,?,?,?,?,?)').run('liga',uid,JSON.stringify([player]),player,1,90);
 }
 const p=await f.call('a','','POST',f.proposal);
 await f.call('b',p.id+'/accept','POST',{},101);
 const closed=f.sql.prepare('SELECT * FROM fantasy_lineups WHERE uid=? AND deadline_at=90').get('a');
 const opened=f.sql.prepare('SELECT * FROM fantasy_lineups WHERE uid=? AND deadline_at=1000').get('a');
 assert.deepEqual(JSON.parse(closed.players_json),['p1']);
 assert.deepEqual(JSON.parse(opened.players_json),[]);
 assert.equal(opened.captain_id,'');
 assert.equal(opened.revision,2);
});

test('liga pausada bloquea propuestas',async t=>{
 const f=fixture(t);
 f.sql.prepare("INSERT INTO fantasy_league_lifecycle VALUES('liga','paused')").run();
 await assert.rejects(f.call('a','','POST',f.proposal),/pausada/i);
});
