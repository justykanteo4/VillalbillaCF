function resolveDeviceTargets(preferences={},teamIds=[],playerIds=[]){
 const ids=values=>[...new Set((Array.isArray(values)?values:[]).map(String))];
 return {teamIds:ids(preferences.teamSelection==='custom'?preferences.teamIds:teamIds),playerIds:ids(playerIds)};
}
module.exports={...require('./functions/targets.cjs'),resolveDeviceTargets};
