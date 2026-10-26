const {upcoming}=require('./upcoming.cjs');
function publishedReport(report,id){return report?.id===id&&(report.published===true||report.closed===true||report.goals?.length>0||report.cards?.length>0)}
function featuredMatch(fixtures,today,report,retainPlayed=false){const next=upcoming(fixtures,today)[0],played=fixtures.filter(m=>m.date&&m.date<=today&&Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore)).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.round-a.round)[0];if(retainPlayed&&played&&(!next||!publishedReport(report,next.id)))return {match:played,retained:true};return {match:next,retained:false}}
module.exports={featuredMatch,publishedReport};
