function upcoming(fixtures,today){return fixtures.filter(m=>m.date&&m.date>=today&&!(typeof m.homeScore==='number'&&typeof m.awayScore==='number')).slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99')).slice(0,4)}
module.exports={upcoming};
