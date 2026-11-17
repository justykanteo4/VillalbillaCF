const fs=require('node:fs'),{cardRecord,summaryFixture}=require('../club-card-records.cjs');
const pack=JSON.parse(fs.readFileSync('assets/offline/club.clubdata','utf8')),entries=new Map(pack.entries.map(e=>[e.key,e.data])),teams=entries.get('/api/news')?.teams||require('../news-seed.json').teams;
const records=teams.flatMap(t=>(t.fixtures||[]).filter(f=>summaryFixture(f,t.id)).map(f=>cardRecord(t.id,f,entries.get('/api/match?team='+t.id+'&match='+f.id))));
fs.writeFileSync('club-cards-seed.json',JSON.stringify({updatedAt:pack.createdAt,records}));console.log('Tarjetas incluidas:',records.filter(r=>r.available).length,'de',records.length,'partidos contabilizables.');
