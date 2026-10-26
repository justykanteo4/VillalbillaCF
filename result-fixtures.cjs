function nextRoundFixtures(team,today){
 const fixtures=(team.fixtures||[]).filter(m=>!(Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore))&&(!m.date||m.date>=today));
 const first=fixtures.slice().sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.round-b.round)[0];
 return first?fixtures.filter(m=>m.round===first.round):[];
}
module.exports={nextRoundFixtures};
