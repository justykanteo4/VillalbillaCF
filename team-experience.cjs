const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');
function trainerTeams(account){const claim=account?.claim;if(!claim||claim.role==='player')return [];return [...new Set([claim.teamId,...(claim.teamIds||[])].filter(Boolean).map(String))]}
function currentRound(fixtures,today){
 const dated=fixtures.filter(m=>/^\d{4}-\d{2}-\d{2}$/.test(m.date||''));
 const noon=new Date(today+'T12:00:00Z'),start=new Date(noon);start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
 const key=d=>d.toISOString().slice(0,10),week=dated.filter(m=>m.date>=key(start)&&m.date<=key(end));
 const next=dated.filter(m=>m.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
 const last=dated.filter(m=>m.date<today).sort((a,b)=>b.date.localeCompare(a.date));
 return (week.sort((a,b)=>a.date.localeCompare(b.date))[0]||next[0]||last[0])?.round??fixtures[0]?.round??null;
}
function calendarOrder(fixtures,today){const round=currentRound(fixtures,today);return fixtures.slice().sort((a,b)=>(a.round===round?-1:0)-(b.round===round?-1:0)||Number(a.round)-Number(b.round)||(a.date||'').localeCompare(b.date||''))}
function detectPlayer(name,players){const key=normalize(name);if(!key||key.split(' ').length<2)return null;const found=players.filter(p=>normalize(p.name)===key);const ids=new Set(found.map(p=>String(p.id)));return ids.size===1?found[0]:null}
module.exports={trainerTeams,currentRound,calendarOrder,detectPlayer,normalize};
