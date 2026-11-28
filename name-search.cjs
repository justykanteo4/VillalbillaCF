function searchTokens(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean)}
function matchesPersonQuery(value,query){const words=searchTokens(value),wanted=searchTokens(query);const remaining=words.slice();return wanted.slice().sort((a,b)=>b.length-a.length).every(part=>{const exact=remaining.indexOf(part),i=exact>=0?exact:remaining.findIndex(word=>word.startsWith(part));if(i<0)return false;remaining.splice(i,1);return true})}
function displayPersonName(value){const parts=String(value||'').split(',').map(p=>p.trim()).filter(Boolean);return parts.length===2?parts[1]+' '+parts[0]:String(value||'').trim()}
module.exports={matchesPersonQuery,displayPersonName,searchTokens};
