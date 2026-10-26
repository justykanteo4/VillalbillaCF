// Three-way merge: change only fields edited locally since the last shared state.
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
function mergeChanges(base,local,remote){
 if(equal(base,local))return remote;
 if(Array.isArray(local)&&(base===undefined||Array.isArray(base))&&[...(base||[]),...local].every(x=>object(x)&&x.id)){
  base=base||[];
  const old=new Map(base.map(x=>[x.id,x])),next=new Map(local.map(x=>[x.id,x]));
  const result=new Map((Array.isArray(remote)?remote:[]).map(x=>[x.id,x]));
  for(const [id,row]of next)if(!equal(old.get(id),row))result.set(id,mergeChanges(old.get(id)||{},row,result.get(id)||{}));
  for(const id of old.keys())if(!next.has(id))result.delete(id);
  return [...result.values()];
 }
 if(object(local)&&(base===undefined||object(base))){
  base=base||{};
  const result={...(object(remote)?remote:{})};
  for(const key of new Set([...Object.keys(base),...Object.keys(local)])){
   if(equal(base[key],local[key]))continue;
   if(!(key in local))delete result[key];
   else result[key]=mergeChanges(base[key],local[key],remote?.[key]);
  }
  return result;
 }
 return local;
}
module.exports={mergeChanges};
