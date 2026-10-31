const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'));
function datePeriod(date){if(!validDate(date))return null;const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+5)%7);return d.toISOString().slice(0,10)}
function periodEnd(start){const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+6);return d.toISOString().slice(0,10)}
function resultDateOptions(teams,today){return [...new Set([datePeriod(today),...teams.flatMap(t=>(t.fixtures||[]).map(m=>datePeriod(m.date)))].filter(Boolean))].sort().concat(teams.some(t=>(t.fixtures||[]).some(m=>!validDate(m.date)))?['undated']:[])}
const hasResult=match=>Number.isInteger(match.homeScore)&&Number.isInteger(match.awayScore);
function matchesByDate(teams,period){return teams.flatMap(team=>(team.fixtures||[]).filter(m=>period==='undated'?!validDate(m.date):datePeriod(m.date)===period).map(match=>({...match,team}))).sort((a,b)=>Number(hasResult(b))-Number(hasResult(a))||(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'99:99').localeCompare(b.time||'99:99')||a.team.category.localeCompare(b.team.category,'es')||String(a.id).localeCompare(String(b.id)))}
function toggleResultTeam(selected,id,available){if(id==='Todos')return [];const next=selected.includes(id)?selected.filter(v=>v!==id):[...selected,id];return available.every(v=>next.includes(v))?[]:next}
module.exports={hasResult,datePeriod,periodEnd,resultDateOptions,matchesByDate,toggleResultTeam};
