function nextRoundFixtures(team,today){
 const fixtures=(team.fixtures||[]).filter(m=>!(Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore))&&(!m.date||m.date>=today));
 const first=fixtures.slice().sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.round-b.round)[0];
 return first?fixtures.filter(m=>m.round===first.round):[];
}
module.exports={nextRoundFixtures};
function resultsRound(team,today){const noon=new Date(today+'T12:00:00Z'),start=new Date(noon),weekday=noon.getUTCDay();start.setUTCDate(start.getUTCDate()-(weekday+6)%7-(weekday===1?7:0));const end=new Date(start);end.setUTCDate(end.getUTCDate()+7);const from=start.toISOString().slice(0,10),to=end.toISOString().slice(0,10),week=(team.fixtures||[]).filter(m=>m.date&&m.date>=from&&m.date<to).sort((a,b)=>b.date.localeCompare(a.date)||b.round-a.round);return week[0]?.round??nextRoundFixtures(team,today)[0]?.round??(team.fixtures||[]).slice().sort((a,b)=>b.round-a.round)[0]?.round??null}
function fixturesForResults(team,today,selected='auto'){const round=selected==='auto'?resultsRound(team,today):Number(selected);return (team.fixtures||[]).filter(m=>m.round===round).slice().sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))}
module.exports.resultsRound=resultsRound;module.exports.fixturesForResults=fixturesForResults;
