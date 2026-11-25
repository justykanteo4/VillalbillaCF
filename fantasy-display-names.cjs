const {displayPersonName}=require('./name-search.cjs');

// Normalize only known person and participant fields; leave league and club names intact.
const personCollections=new Set(['players','coaches','player','manager','listings','roster','rivals','members']);
const personFields=new Set(['nickname','playerName','coachName','managerName','proposerPlayerName','receiverPlayerName','owner','buyer','seller','lender','borrower','proposer','receiver']);
function fantasyDisplayNames(value, person=false) {
 if(Array.isArray(value))return value.map(item=>fantasyDisplayNames(item,person));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,item])=>{
  if(typeof item==='string'&&((key==='name'&&person)||personFields.has(key)))return [key,(person==='participant'&&key==='name'||['nickname','owner','buyer','seller','lender','borrower','proposer','receiver'].includes(key))&&item!==item.toLocaleUpperCase('es')?item:displayPersonName(item)];
  return [key,fantasyDisplayNames(item,key==='rivals'?'participant':personCollections.has(key))];
 }));
}
module.exports={fantasyDisplayNames};
