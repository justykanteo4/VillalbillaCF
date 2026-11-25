const {displayPersonName}=require('./name-search.cjs');

// Player and staff records keep their IDs and every other field intact.
function fantasyDisplayNames(value, person=false) {
 if(Array.isArray(value))return value.map(item=>fantasyDisplayNames(item,person));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,item])=>{
  if((key==='name'&&person)||key==='playerName')return [key,displayPersonName(item)];
  return [key,fantasyDisplayNames(item,['players','coaches','player','manager'].includes(key))];
 }));
}
module.exports={fantasyDisplayNames};
