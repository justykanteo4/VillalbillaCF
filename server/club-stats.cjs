const teams=require('../teams.json');
const news=require('./news.cjs'),matches=require('./match.cjs');
const {cardsForTeam}=require('./sanctions.cjs');
const PAGE_SIZE=12,cache=new Map(),pending=new Map();
async function clubStats(teamId,offset=0){
 const team=teams.find(row=>row.id===String(teamId));if(!team)return null;
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000)throw Error('Página no válida');
 const key=team.id+':'+offset,old=cache.get(key);
 if(old&&Date.now()-old.time<300000)return old.data;
 if(pending.has(key))return pending.get(key);
 const work=(async()=>{
  try{
   const fixtures=(await news.groupFixtures(team.id)||[]).filter(match=>(match.homeId===team.id||match.awayId===team.id)&&Number.isInteger(match.homeScore)&&Number.isInteger(match.awayScore)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.id.localeCompare(b.id));
   const page=fixtures.slice(offset,offset+PAGE_SIZE),records=[];
   // At most 12 reports plus the calendar per request, within Workers Free subrequest limits.
   for(let i=0;i<page.length;i+=3)await Promise.all(page.slice(i,i+3).map(async fixture=>{
    const act=await matches.matchFixtureDetails(team.id,fixture,team.id);
    const cards=cardsForTeam(act,fixture,team.id);
    records.push({teamId:team.id,id:fixture.id,available:cards!==null,yellow:cards?.filter(card=>card.color==='yellow'||card.type==='Segunda amarilla').length??null,red:cards?.filter(card=>card.color==='red').length??null});
   }));
   const data={teamId:team.id,records,nextOffset:offset+PAGE_SIZE<fixtures.length?offset+PAGE_SIZE:null,updatedAt:new Date().toISOString(),error:false};
   cache.set(key,{time:Date.now(),data});return data;
  }catch{return {teamId:team.id,records:[],nextOffset:null,error:true}}
 })().finally(()=>pending.delete(key));pending.set(key,work);return work;
}
module.exports={clubStats};
