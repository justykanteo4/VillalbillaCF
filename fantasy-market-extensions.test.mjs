import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import policy from './fantasy-leagues.cjs';
import game from './fantasy-game-policy.cjs';
import {clauseRoute,completedRounds} from './fantasy-clause-routes.mjs';
import {managerListingRoute} from './fantasy-manager-listings.mjs';
import {auctionSnapshot,placeBid,settleAuctions} from './fantasy-auctions.mjs';
import {marketRoute} from './fantasy-market.mjs';

const schemas=['fantasy-schema.sql','fantasy-club-schema.sql','fantasy-actas-schema.sql',
 'fantasy-access-schema.sql','social-schema.sql','fantasy-game-schema.sql',
 'fantasy-rewards-schema.sql','fantasy-auction-schema.sql','fantasy-sales-schema.sql',
 'fantasy-resale-schema.sql','fantasy-clause-schema.sql','fantasy-manager-listings-schema.sql'];
const start=Date.parse('2026-10-01T12:00:00Z'),week=7*86400000;
const schedule=Array.from({length:7},(_,i)=>({id:'m'+i,teamId:'team',week:i,startsAt:start+i*week}));
const at=start+4*week+3*86400000;
function fixture(t){
 const sql=new DatabaseSync(':memory:');
 sql.exec('PRAGMA foreign_keys=ON');
 for(const s of schemas)sql.exec(readFileSync(s,'utf8'));
 t.after(()=>sql.close());
 const settings={...policy.classicSettings,clausesEnabled:true};
 const league={id:'league',teamId:'team',settings,createdAt:start,finance:{}};
 sql.prepare('INSERT INTO fantasy_leagues VALUES(?,?,?,?,?,?,?,?,?,?)')
 .run('league','club-system','request','fingerprint','Liga','classic',JSON.stringify({type:'club'}),JSON.stringify(settings),'12345678',start);
 for(const uid of ['buyer','seller'])sql.prepare('INSERT INTO fantasy_members VALUES(?,?,?,?)').run('league',uid,uid,start);
 const prepare=(q,args=[])=>({
  bind:(...a)=>prepare(q,a),
  first:async()=>sql.prepare(q).get(...args),
  all:async()=>({results:sql.prepare(q).all(...args)}),
  run:async()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}})
 });
 const db={prepare,batch:async statements=>{
  sql.exec('BEGIN');
  try{const res=[];for(const s of statements)res.push(await s.run());sql.exec('COMMIT');return res}
  catch(e){sql.exec('ROLLBACK');throw e}
 }};
 function roster(uid,n,acquiredAt=start+week){
  for(let i=0;i<n;i++){
   const pid=uid+'-'+i;
   sql.prepare('INSERT INTO fantasy_roster VALUES(?,?,?,?,?,?)').run('own-'+pid,'league',uid,pid,acquiredAt,20);
  }
 }
 roster('buyer',12);roster('seller',13);
 const players=['buyer','seller'].flatMap(uid=>Array.from({length:uid==='buyer'?12:13},(_,i)=>({
  id:uid+'-'+i,name:uid+' player '+i,price:10,priceRevision:0
 })));
 return {sql,db,league,players,now:at,requestId:'request-12345',
  quote:args=>clauseRoute({db,league,uid:'buyer',now:at,getNow:()=>at,
   players,schedule,method:'GET',action:'clause',ownershipId:'own-seller-0',...args})};
}

test('calendario de jornadas evita desbloquear al jugador antes de completar dos jornadas',()=>{
 assert.equal(completedRounds(schedule,'team',start+week-1),1);
 assert.equal(completedRounds(schedule,'team',start+week+4*3600000),2);
 assert.equal(completedRounds(schedule,'unknown',at),null);
});

test('el cálculo, gasto y compra de cláusula son atómicos y no se duplican',async t=>{
 const f=fixture(t);
 const first=await f.quote();
 assert.equal(first.baseCents,1600);
 assert.equal(first.protectedRoundsRemaining,0);
 const boost=await clauseRoute({db:f.db,league:f.league,uid:'seller',now:f.now,getNow:()=>f.now,
  players:f.players,schedule,action:'clause/boost',method:'POST',
  readBody:async()=>({ownershipId:'own-seller-0',amount:1,requestId:'boost-123456'})});
 assert.equal(boost.addedCents,200);
 assert.equal(f.sql.prepare("SELECT delta_cents FROM fantasy_wallet_cents WHERE uid='seller'").get().delta_cents,-100);
 const afterBoost=await f.quote();
 assert.equal(afterBoost.amountCents,1800);
 const purchaseArgs={db:f.db,league:f.league,uid:'buyer',now:f.now,getNow:()=>f.now,
  players:f.players,schedule,method:'POST',action:'clause',
  readBody:async()=>({ownershipId:'own-seller-0',expectedCents:1800,requestId:'purchase-123456'})};
 const bought=await clauseRoute(purchaseArgs);
 assert.equal(bought.amountCents,1800);
 assert.equal(f.sql.prepare("SELECT uid FROM fantasy_roster WHERE player_id='seller-0'").get().uid,'buyer');
 assert.equal(f.sql.prepare("SELECT delta_cents FROM fantasy_wallet_cents WHERE uid='buyer'").get().delta_cents,-1800);
 assert.equal(f.sql.prepare("SELECT delta_cents FROM fantasy_wallet_cents WHERE uid='seller'").get().delta_cents,1700);
 await clauseRoute(purchaseArgs);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM fantasy_trades").get().n,1);
 assert.equal(f.sql.prepare("SELECT delta_cents FROM fantasy_wallet_cents WHERE uid='buyer'").get().delta_cents,-1800);
});

test('anuncio con precio personalizado crea subasta sin transferir jugador hasta adjudicación',async t=>{
 const f=fixture(t);
 const listed=await managerListingRoute({db:f.db,league:f.league,uid:'seller',now:f.now,
  method:'POST',readBody:async()=>({playerId:'seller-0',ownershipId:'own-seller-0',minPrice:14,requestId:'listing-123456'})});
 assert.equal(listed.saved,true);
 assert.equal(f.sql.prepare("SELECT uid FROM fantasy_roster WHERE player_id='seller-0'").get().uid,'seller');
 const market=await auctionSnapshot(f.db,'league','buyer',f.players,f.now);
 const auction=market.auctions.find(v=>v.listingId===listed.listingId);
 assert.equal(auction.minBid,14);
 await placeBid({db:f.db,league:f.league,uid:'buyer',now:f.now,value:{listingId:listed.listingId,amount:15}});
 await settleAuctions(f.db,f.league,auction.closesAt+1);
 assert.equal(f.sql.prepare("SELECT uid FROM fantasy_roster WHERE player_id='seller-0'").get().uid,'buyer');
 assert.equal(f.sql.prepare("SELECT delta_cents FROM fantasy_wallet_cents WHERE uid='buyer'").get().delta_cents,-1500);
 assert.equal(f.sql.prepare("SELECT delta_cents FROM fantasy_wallet_cents WHERE uid='seller'").get().delta_cents,1500);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM fantasy_trades").get().n,1);
});

test('dos pagos en jornadas distintas caducan por separado sin prorrogar el anterior',async t=>{
 const f=fixture(t);
 const event=f.sql.prepare('INSERT INTO fantasy_clause_boost_events(id,league_id,uid,ownership_id,amount_cents,gross_cents,created_at,start_round,request_id) VALUES(?,?,?,?,?,?,?,?,?)');
 event.run('event-a','league','seller','own-seller-0',100,5200,start+2*week+86400000,3,'boost-round-3');
 event.run('event-b','league','seller','own-seller-0',200,5200,start+3*week+86400000,4,'boost-round-4');
 const quoteAt=async now=>clauseRoute({db:f.db,league:f.league,uid:'buyer',now,players:f.players,
  schedule,method:'GET',action:'clause',ownershipId:'own-seller-0'});
 assert.equal((await quoteAt(start+3*week+86400000)).amountCents,2200);
 assert.equal((await quoteAt(start+4*week+86400000)).amountCents,2000);
 assert.equal((await quoteAt(start+5*week+86400000)).amountCents,1600);
});

test('el rival puede hacer oferta directa durante una venta; aceptarla retira el anuncio y no duplica jugador',async t=>{
 const f=fixture(t); f.league.finance={balance:100};
 const sale=await managerListingRoute({db:f.db,league:f.league,uid:'seller',now:f.now,method:'POST',readBody:async()=>({playerId:'seller-0',ownershipId:'own-seller-0',minPrice:14,requestId:'sale-offer-123456'})});
 const bid=await marketRoute({db:f.db,league:f.league,uid:'buyer',now:f.now,method:'POST',action:'offers',readBody:async()=>({ownershipId:'own-seller-0',amount:16,requestId:'direct-offer-123456'}),players:f.players,canPlay:async()=>true});
 assert.equal(bid.saved,true);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM fantasy_offers WHERE league_id=? AND ownership_id=? AND status=?').get('league','own-seller-0','pending').n,1);
 const accepted=await marketRoute({db:f.db,league:f.league,uid:'seller',now:f.now,method:'POST',action:'offers/'+bid.id+'/accept',readBody:async()=>({}),players:f.players,canPlay:async()=>true});
 assert.equal(accepted.saved,true);
 assert.equal(f.sql.prepare('SELECT uid FROM fantasy_roster WHERE player_id=?').get('seller-0').uid,'buyer');
 assert.equal(f.sql.prepare('SELECT retired_day FROM fantasy_market_listings WHERE id=?').get(sale.listingId).retired_day!=null,true);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM fantasy_roster WHERE league_id=? AND player_id=?').get('league','seller-0').n,1);
});
test('retirar anuncio solo a partir de 48 horas, sin transferir al jugador',async t=>{
 const f=fixture(t);
 const sale=await managerListingRoute({db:f.db,league:f.league,uid:'seller',now:f.now,method:'POST',readBody:async()=>({playerId:'seller-0',ownershipId:'own-seller-0',minPrice:14,requestId:'sale-hold-123456'})});
 const cancel=(now,id)=>managerListingRoute({db:f.db,league:f.league,uid:'seller',now,method:'POST',readBody:async()=>({playerId:'seller-0',ownershipId:'own-seller-0',cancel:true,requestId:id})});
 const quote=await managerListingRoute({db:f.db,league:f.league,uid:'seller',now:f.now+47*3600000,method:'GET',playerId:'seller-0'});
 assert.equal(quote.listing.canWithdraw,false);
 await assert.rejects(()=>cancel(f.now+47*3600000,'cancel-47hours'),/48 horas/);
 const late=await cancel(f.now+48*3600000,'cancel-48hours');
 assert.equal(late.cancelled,true);
 assert.equal(f.sql.prepare('SELECT retired_day FROM fantasy_market_listings WHERE id=?').get(sale.listingId).retired_day!=null,true);
 assert.equal(f.sql.prepare('SELECT uid FROM fantasy_roster WHERE player_id=?').get('seller-0').uid,'seller');
});
