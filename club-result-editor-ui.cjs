// Only fixtures with validated RFFM identifiers can be submitted for correction.
const validScore=value=>typeof value==='string'&&/^(?:0|[1-9][0-9]?)$/.test(value.trim());
function editableFixtures(fixtures){
 return (Array.isArray(fixtures)?fixtures:[])
  .filter(m=>/^\d{1,20}$/.test(String(m?.id||'')))
  .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.round||0)-Number(a.round||0));
}
function scoreDraft(value){return Number.isInteger(value)&&value>=0&&value<=99?String(value):''}
module.exports={validScore,editableFixtures,scoreDraft};
