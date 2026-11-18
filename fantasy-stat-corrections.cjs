// Fantasy-only overlays: immutable official report objects and partial flags are preserved.
const fields=['goals','assists','yellow','red','ownGoals'];
const digits=value=>Number.isSafeInteger(value)&&value>=0&&value<=20;
function validStats(value){
 return value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===fields.length&&fields.every(k=>Object.hasOwn(value,k)&&digits(value[k]))&&
 value.ownGoals<=value.goals;
}
function statsFromPlayer(player){
 return Object.fromEntries(fields.map(k=>[k,Number.isSafeInteger(player[k])&&player[k]>=0?player[k]:0]));
}
function applyStatCorrections(matches,rows){
 if(!Array.isArray(matches)||!Array.isArray(rows)||!rows.length)return matches;
 const byMatch=new Map();
 for(const row of rows){
  const key=String(row.team_id)+':'+String(row.match_id);
  if(!byMatch.has(key))byMatch.set(key,new Map());
  const stats=typeof row.stats_json==='string'?JSON.parse(row.stats_json):row.stats_json;
  if(validStats(stats))byMatch.get(key).set(String(row.player_id),stats);
 }
 return matches.map(match=>{
  const changed=byMatch.get(String(match.teamId)+':'+String(match.id));
  if(!changed)return match;
  return {...match,players:match.players.map(player=>{
   const edit=changed.get(String(player.id));
   return edit?{...player,...edit,statsCorrected:true}:player;
  })};
 });
}
module.exports={fields,validStats,statsFromPlayer,applyStatCorrections};
