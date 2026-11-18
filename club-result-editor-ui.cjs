// Only fixtures with validated RFFM identifiers can be submitted for correction.
const validScore=value=>typeof value==='string'&&/^(?:0|[1-9][0-9]?)$/.test(value.trim());
function editableFixtures(fixtures){
 return (Array.isArray(fixtures)?fixtures:[])
  .filter(m=>/^\d{1,20}$/.test(String(m?.id||'')))
  .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.round||0)-Number(a.round||0));
}
function scoreDraft(value){return Number.isInteger(value)&&value>=0&&value<=99?String(value):''}

// Search is local: never reveals fixtures beyond the authenticated team's directory.
const normalizeSearch=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
function filterEditableFixtures(fixtures,term){
 const query=normalizeSearch(term).trim();
 if(!query)return fixtures;
 return fixtures.filter(m=>normalizeSearch([m.homeName,m.homeTeam,m.home,m.awayName,m.awayTeam,m.away,m.date,m.round,m.id].join(' ')).includes(query));
}
module.exports={validScore,editableFixtures,scoreDraft,filterEditableFixtures};
