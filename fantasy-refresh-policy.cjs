// Calendar-aware private cache; all mutations are still validated by the server.
const MINUTE=60000,HOUR=60*MINUTE,DAY=24*HOUR;
const madrid=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'});
function dayInfo(at){const parts=madrid.formatToParts(new Date(at));return {key:parts.filter(p=>['year','month','day'].includes(p.type)).map(p=>p.value).join('-'),weekend:parts.some(p=>p.type==='weekday'&&['Sat','Sun'].includes(p.value))}}
function fantasyRefreshAge(path,at=Date.now()){
 const pathname=String(path||'').split('?')[0],weekend=dayInfo(at).weekend;
 if(pathname==='/preview'||pathname==='/leagues')return 15000;
 if(pathname==='/inbox')return 2*MINUTE;
 if(/^\/leagues\/[^/]+\/(market|search|market-history)$/.test(pathname))return DAY;
 if(/^\/leagues\/[^/]+\/(exchanges|loans|alerts)$/.test(pathname))return 2*MINUTE;
 if(/^\/leagues\/[^/]+\/rivals$/.test(pathname))return 15*MINUTE;
 if(/^\/leagues\/[^/]+\/(table|players)$/.test(pathname))return weekend?5*MINUTE:DAY;
 if(/^\/leagues\/[^/]+\/coaches$/.test(pathname))return weekend?15*MINUTE:DAY;
 if(/^\/leagues\/[^/]+\/(squad|lineup|transactions)$/.test(pathname))return 5*MINUTE;
 return 15000;
}
function fantasyCacheFresh(path,savedAt,at=Date.now()){
 const age=at-savedAt;if(!Number.isFinite(age)||age<0)return false;
 const pathname=String(path||'').split('?')[0];
 if(/^\/leagues\/[^/]+\/(market|search|market-history)$/.test(pathname))return dayInfo(savedAt).key===dayInfo(at).key;
 return age<fantasyRefreshAge(path,at);
}
module.exports={fantasyRefreshAge,fantasyCacheFresh};
