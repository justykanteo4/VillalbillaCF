const score=value=>typeof value==='number'&&Number.isInteger(value)&&value>=0?value:typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value.trim()):null;
async function fillResultScores(teams,loadReport,today){
 const tasks=[];
 for(const team of teams)for(const match of team.fixtures||[]){
  if(Number.isInteger(match.homeScore)&&Number.isInteger(match.awayScore))continue;
  const age=(Date.parse(today+'T12:00:00Z')-Date.parse(match.date+'T12:00:00Z'))/86400000;
  if(!Number.isFinite(age)||age<0||age>6)continue;
  tasks.push(async()=>{try{
   const report=await loadReport(team,match);
   if(report?.error||!report?.closed||String(report.id)!==String(match.id)||String(report.homeId)!==String(match.homeId)||String(report.awayId)!==String(match.awayId))return;
   const home=score(report.homeScore),away=score(report.awayScore);
   if(home===null||away===null)return;
   match.homeScore=home;match.awayScore=away;
  }catch{}});
 }
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(3,tasks.length)},async()=>{while(cursor<tasks.length)await tasks[cursor++]()}));
 return teams;
}
module.exports={fillResultScores};
