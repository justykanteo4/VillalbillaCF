function resolveDeviceTargets(preferences={},teamIds=[],playerIds=[]){
 const ids=values=>[...new Set((Array.isArray(values)?values:[]).map(String))];
 return {teamIds:ids(preferences.teamSelection==='custom'?preferences.teamIds:teamIds),playerIds:ids(preferences.playerSelection==='custom'?preferences.playerIds:playerIds)};
}
module.exports={...require('./functions/targets.cjs'),resolveDeviceTargets};
