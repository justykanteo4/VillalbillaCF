const {normalize}=require('./team-experience.cjs');
function accessDirectory(staff,rosters){
 const coaches=new Map(),players=new Map();
 for(const t of staff)for(const p of t.people||[]){const key=normalize(p.name);if(!key)continue;const row=coaches.get(key)||{id:'trainer:'+key,name:p.name,role:'trainer',teamIds:[],playerTeams:[]};if(!row.teamIds.includes(t.teamId))row.teamIds.push(t.teamId);coaches.set(key,row)}
 for(const t of rosters)for(const p of t.players||[]){const id=String(p.id||'');if(!id)continue;const row=players.get(id)||{id:'player:'+id,playerId:id,name:p.name,role:'player',teamIds:[],playerTeams:[]};if(!row.teamIds.includes(t.teamId)){row.teamIds.push(t.teamId);row.playerTeams.push({teamId:t.teamId,playerId:id,name:p.name})}players.set(id,row)}
 const assigned=new Set();for(const row of coaches.values()){const found=[...players.values()].filter(p=>normalize(p.name)===normalize(row.name));if(found.length===1){row.playerTeams=found[0].playerTeams;row.isPlayer=true;assigned.add(found[0].id)}else{row.isPlayer=false;row.ambiguousPlayer=found.length>1}}
 return [...coaches.values(),...[...players.values()].filter(p=>!assigned.has(p.id)).map(p=>({...p,isPlayer:true}))].sort((a,b)=>a.name.localeCompare(b.name,'es'));
}
function identityClaim(identity,catalog){
 if(!identity||!['trainer','player'].includes(identity.role))throw Error('Selecciona tu ficha oficial.');
 const ids=[...new Set(identity.teamIds||[])],selected=ids.map(id=>catalog.find(t=>t.id===id));if(!selected.length||selected.some(t=>!t))throw Error('La ficha no tiene equipos válidos.');
 const first=selected[0];return {teamId:first.id,teamIds:ids,name:identity.name,category:selected.map(t=>t.category).join(' · '),teamName:first.name,role:identity.role,isPlayer:!!identity.isPlayer,playerTeams:identity.playerTeams||[],...(identity.role==='player'?{playerId:identity.playerId}:{assignments:selected.map(t=>({teamId:t.id,name:identity.name,category:t.category,teamName:t.name}))})};
}
module.exports={accessDirectory,identityClaim};
