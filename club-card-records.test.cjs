const {test}=require('node:test'),assert=require('node:assert/strict'),{cardRecord,mergeCardRecords,knownCards}=require('./club-card-records.cjs'),{buildClubSummary}=require('./club-summary.cjs'),{loadClubCards}=require('./club-card-loader.cjs');
const fixture=(id='1')=>({id,homeId:'680163',awayId:'rival',home:'VILLALBILLA C.F.',away:'Rival',homeScore:2,awayScore:1,date:'2026-10-25'});
const team=fixtures=>({id:'680163',fixtures});
const report=(id='1',extra={})=>({id,homeId:'680163',awayId:'rival',closed:true,cardsAvailable:true,updatedAt:'2026-11-07T10:00:00Z',cards:[{team:'VILLALBILLA C.F.',color:'yellow',type:'Amarilla'},{team:'VILLALBILLA C.F.',color:'red',type:'Segunda amarilla'},{team:'Rival',color:'red'}],...extra});
function cache(entries=[]){const copies=new Map(entries);return {copies,readCopy:async key=>copies.get(key),saveCopy:async(key,data)=>copies.set(key,{data,savedAt:new Date().toISOString()})}}
test('only closed reports confirm cards; rival cards and wrong reports cannot enter the total',()=>{
 const row=cardRecord('680163',fixture(),report());assert.deepEqual([row.yellow,row.red],[2,1]);assert(knownCards(row));for(const r of [report('2'),report('1',{closed:false,cards:[]}),report('1',{cardsAvailable:false}),null])assert(!knownCards(cardRecord('680163',fixture(),r)));assert(knownCards(cardRecord('680163',fixture(),report('1',{cards:[]}))));
});
test('failed refresh and older cache cannot reduce confirmed counts; a newer official correction can',()=>{
 const old=cardRecord('680163',fixture(),report());let rows=mergeCardRecords([old],[{teamId:'680163',id:'1',available:false}]);assert.equal(rows[0].yellow,2);assert.equal(rows[0].stale,true);rows=mergeCardRecords(rows,[{...old,yellow:0,updatedAt:'2026-10-01'}]);assert.equal(rows[0].yellow,2);rows=mergeCardRecords(rows,[{...old,yellow:1,updatedAt:'2026-11-08'}]);assert.equal(rows[0].yellow,1);assert.equal(rows.length,1);
});
test('loads saved reports without any network calls and persists a complete summary across restart',async()=>{
 const f=fixture(),io=cache([['/api/match?team=680163&match=1',{data:report()}]]);let last;
 await loadClubCards([team([f])],{...io,fetchPage:()=>assert.fail('Must use the saved report'),onRecords:rows=>last=rows});assert.equal(last[0].yellow,2);assert(io.copies.has('team-card-totals.v1.680163'));io.copies.delete('/api/match?team=680163&match=1');await loadClubCards([team([f])],{...io,fetchPage:()=>assert.fail('Must survive restart from stored totals'),onRecords:rows=>last=rows});assert.equal(last[0].yellow,2);
});
test('failed pending request does not erase cached totals and requests only missing match ids',async()=>{
 const io=cache([['team-card-totals.v1.680163',{data:{records:[cardRecord('680163',fixture(),report())]}}]]),paths=[];let last;
 await loadClubCards([team([fixture(),fixture('2')])],{...io,fetchPage:async path=>{paths.push(path);throw Error('Sin red')},onRecords:rows=>last=rows});assert.equal(new URL(paths[0],'https://local').searchParams.get('pending'),'2');const total=buildClubSummary([team([fixture(),fixture('2')])],last);assert.equal(total.yellow,2);assert.equal(total.cardMatches,1);assert.equal(total.cardsComplete,false);
});
test('manual refresh retains confirmed cards after error and applies a later successful retry',async()=>{
 const io=cache(),seed=[cardRecord('680163',fixture(),report())];let last;
 await loadClubCards([team([fixture()])],{...io,seed,force:true,today:'2026-10-25',fetchPage:async()=>({error:true,records:[]}),onRecords:rows=>last=rows});assert.equal(last[0].yellow,2);assert.equal(last[0].stale,true);
 await loadClubCards([team([fixture()])],{...io,fetchPage:async()=>({records:[{...seed[0],yellow:3,updatedAt:'2026-11-08'}],nextOffset:null}),onRecords:rows=>last=rows});assert.equal(last[0].yellow,3);assert.equal(last[0].stale,false);
});
test('a future published result is retained but an unclosed blank acta is not treated as zero cards',()=>{
 const f={...fixture(),date:'2027-04-03'},row=cardRecord('680163',f,report('1',{closed:false,cards:[]})),total=buildClubSummary([team([f])],[row]);assert.equal(total.matches,1);assert.equal(total.yellow,0);assert.equal(total.cardMatches,0);assert.equal(total.unclosedCards,1);assert.equal(total.cardsComplete,false);
});
test('successful missing report completes the summary; duplicate and stale responses do not duplicate cards',async()=>{
 const io=cache(),one=cardRecord('680163',fixture(),report()),two=cardRecord('680163',fixture('2'),report('2'));let last;
 await loadClubCards([team([fixture(),fixture('2')])],{...io,seed:[one],fetchPage:async(path,options)=>{options.onUpdate({records:[two]});return {records:[two],nextOffset:null}},onRecords:rows=>last=rows});const total=buildClubSummary([team([fixture(),fixture('2')])],last);assert.equal(total.yellow,4);assert.equal(total.cardMatches,2);assert.equal(total.cardsComplete,true);assert.equal(last.length,2);
});
test('aborting a refresh cannot replace the existing saved summary with an empty list',async()=>{
 const io=cache([['team-card-totals.v1.680163',{data:{records:[cardRecord('680163',fixture(),report())]}}]]),controller=new AbortController();controller.abort();await loadClubCards([team([fixture()])],{...io,signal:controller.signal,fetchPage:()=>assert.fail('Aborted'),onRecords:()=>assert.fail('Aborted callback')});assert.equal(io.copies.get('team-card-totals.v1.680163').data.records[0].yellow,2);
});
