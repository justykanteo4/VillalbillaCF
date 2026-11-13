function madridDay(value){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))/86400000}
const dayLabel=day=>new Date(day*86400000).toISOString().slice(0,10);
const weekKey=now=>Math.floor((madridDay(now)+3)/7);
module.exports={madridDay,dayLabel,weekKey};
