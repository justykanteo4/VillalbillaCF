const {displayPersonName}=require('./name-search.cjs');
function orderFantasyRows(rows, order='points', field='fantasyPoints') {
 const score=row=>Number.isFinite(row?.[field])?row[field]:-Infinity;
 const label=row=>displayPersonName(row?.name??row?.nickname??'');
 return [...(rows||[])].sort((a,b)=>{
  if(order==='name')return label(a).localeCompare(label(b),'es')||score(b)-score(a);
  return score(b)-score(a)||label(a).localeCompare(label(b),'es');
 });
}
module.exports={orderFantasyRows};
