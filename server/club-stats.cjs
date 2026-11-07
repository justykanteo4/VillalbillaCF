const teams=require('../teams.json'),news=require('./news.cjs'),matches=require('./match.cjs');
const {summaryFixture,cardRecord,mergeCardRecords}=require('../club-card-records.cjs');
const PAGE_SIZE=3,cache=new Map(),pendingRequests=new Map();
async function clubStats(teamId,offset=0,db=null,{pending=null}={}){
 const team=teams.find(row=>row.id===String(teamId));if(!team)return null;
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000)throw Error('Página no válida');
 const key=team.id+':'+offset+':'+(pending||[]).join(','),old=cache.get(key);
 if(old&&Date.now()-old.time<(old.data.records.every(r=>r.available&&!r.stale)?300000:30000))return old.data;
 if(pendingRequests.has(key))return pendingRequests.get(key);
 const work=(async()=>{try{
  const fixtures=(await news.groupFixtures(team.id)||[]).filter(m=>summaryFixture(m,team.id)&&(!pending||pending.includes(String(m.id)))).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||String(a.id).localeCompare(String(b.id)));
  const page=fixtures.slice(offset,offset+PAGE_SIZE),records=await Promise.all(page.map(async fixture=>{try{const act=await matches.matchFixtureDetails(team.id,fixture,team.id,{db,refresh:!!pending?.includes(String(fixture.id))});return cardRecord(team.id,fixture,act)}catch{return cardRecord(team.id,fixture,null)}}));
  const data={teamId:team.id,records:mergeCardRecords(old?.data?.records,records),nextOffset:offset+PAGE_SIZE<fixtures.length?offset+PAGE_SIZE:null,updatedAt:new Date().toISOString(),error:false};cache.set(key,{time:Date.now(),data});return data;
 }catch{return {...(old?.data||{teamId:team.id,records:[],nextOffset:null}),error:true}}})().finally(()=>pendingRequests.delete(key));pendingRequests.set(key,work);return work;
}
module.exports={clubStats};
