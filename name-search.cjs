function searchTokens(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean)}
function matchesPersonQuery(value,query){const words=searchTokens(value),wanted=searchTokens(query);return wanted.every(part=>words.some(word=>word.startsWith(part)))}
function displayPersonName(value){const parts=String(value||'').split(',').map(p=>p.trim()).filter(Boolean);return parts.length===2?parts[1]+' '+parts[0]:String(value||'').trim()}
module.exports={matchesPersonQuery,displayPersonName,searchTokens};
