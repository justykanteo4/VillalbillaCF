function adjustmentFor(rows,teamId,playerId){return (rows||[]).find(r=>r.teamId===String(teamId)&&r.playerId===String(playerId))}
function adjustKeeper(player,teamId,rows){const adjustment=adjustmentFor(rows,teamId,player.id),base=player.officialGoalsConceded??player.goalsConceded;return {...player,officialGoalsConceded:base,goalsConceded:Number.isInteger(base)?Math.max(0,base+(adjustment?.delta||0)):base,goalsConcededAdjustment:adjustment?.delta||0}}
function mergeAdjustments(old=[],incoming=[]){const map=new Map(old.map(r=>[r.teamId+':'+r.playerId,r]));for(const r of incoming){const key=r.teamId+':'+r.playerId;if((map.get(key)?.version||0)<=r.version)map.set(key,r)}return [...map.values()]}
function permittedTeams(profile){const c=profile?.claim;if(profile?.status!=='approved'||!['trainer','coach'].includes(c?.role))return [];return [...new Set([c.teamId,...(c.teamIds||[])].filter(v=>typeof v==='string'))]}
module.exports={adjustmentFor,adjustKeeper,mergeAdjustments,permittedTeams};
