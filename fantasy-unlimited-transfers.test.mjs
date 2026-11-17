import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

test('unlimited weekly transfers remove only the quota guard, retaining trade protections',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const schema of ['fantasy-schema.sql','fantasy-club-schema.sql','fantasy-actas-schema.sql','fantasy-access-schema.sql','fantasy-game-schema.sql','fantasy-rewards-schema.sql','fantasy-auction-schema.sql','fantasy-sales-schema.sql','fantasy-resale-schema.sql','fantasy-clause-schema.sql','fantasy-manager-listings-schema.sql']) db.exec(readFileSync(schema,'utf8'));
  db.exec(readFileSync('fantasy-unlimited-transfers.sql','utf8'));
  const trigger=db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name='fantasy_trade_guard'").get()?.sql;
  assert.ok(trigger,'Trade trigger must exist after migration');
  assert.doesNotMatch(trigger,/FANTASY_TRANSFERS|settings_json[^;]*transfers/);
  for(const guard of ['FANTASY_FUNDS','FANTASY_ROSTER_MAX','FANTASY_OWNED','FANTASY_AUCTION_REQUIRED','FANTASY_OFFER_CHANGED']) assert.match(trigger,new RegExp(guard));
  db.exec(readFileSync('fantasy-unlimited-transfers.sql','utf8'));
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='fantasy_trade_guard'").get(),'migration should be rerunnable');
 }finally{db.close()}
});
