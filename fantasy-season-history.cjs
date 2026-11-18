// Agrupa exclusivamente puntuaciones confirmadas ya devueltas por la API.
// Temporada deportiva española: agosto-julio. La fecha es la fuente de verdad.
function seasonFromDate(date){
 if(typeof date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return null;
 const [year,month,day]=date.split('-').map(Number);
 const check=new Date(Date.UTC(year,month-1,day));
 if(!Number.isInteger(year)||year<2000||year>2100||check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return null;
 const start=month>=8?year:year-1;
 return String(start)+'/'+String(start+1).slice(-2);
}
function groupSeasonRounds(rounds=[]){
 const seasons=new Map();
 for(const round of rounds){
  if(!Number.isSafeInteger(round?.week))continue;
  const season=seasonFromDate(round.date);
  if(!season)continue;
  if(!seasons.has(season))seasons.set(season,[]);
  seasons.get(season).push(round);
 }
 return [...seasons].sort(([a],[b])=>b.localeCompare(a)).map(([season,items])=>({season,rounds:items.sort((a,b)=>b.week-a.week)}));
}
function seasonSummary(rows=[],season){
 const totals=rows.map((row,index)=>{
  const matches=(row.rounds||[]).filter(r=>seasonFromDate(r.date)===season&&Number.isFinite(r.points));
  const points=matches.reduce((total,r)=>total+r.points,0);
  return {key:index,nickname:row.nickname,me:!!row.me,points,rounds:matches.length};
 }).filter(r=>r.rounds>0).sort((a,b)=>b.points-a.points||a.nickname.localeCompare(b.nickname,'es'));
 let previous=null,rank=0;
 return totals.map((r,index)=>{if(r.points!==previous)rank=index+1;previous=r.points;return {...r,rank}});
}
module.exports={seasonFromDate,groupSeasonRounds,seasonSummary};
