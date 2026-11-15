const {formations}=require('./fantasy-formations.cjs');
function fieldGroup(player){const role=String(player.position||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/portero|guardameta|^por$/.test(role))return 'keeper';if(/defensa|central|lateral|carrilero|^def$/.test(role))return 'defence';if(/centrocampista|mediocentro|interior|medio|pivote|volante|^med$|^cen$/.test(role))return 'midfield';if(/delantero|extremo|punta|atacante|^del$/.test(role))return 'attack';return null}
const roleNames={keeper:'Portero',defence:'Defensa',midfield:'Centrocampista',attack:'Delantero'};
function weeklyFormation(players=[]){
 const ranked=[...new Map(players.map(p=>[p.id,p])).values()].sort((a,b)=>(b.weekPoints||0)-(a.weekPoints||0)||a.name.localeCompare(b.name,'es')),keeper=ranked.find(p=>fieldGroup(p)==='keeper'),field=ranked.filter(p=>fieldGroup(p)!=='keeper');let best;
 for(const formation of formations){const roles=formation.split('-').flatMap((count,i)=>Array(Number(count)).fill(['defence','midfield','attack'][i])),chosen=Array(10).fill(null),used=new Set();let matched=0,improvised=0,total=keeper?.weekPoints||0;
  // Reserve all known roles first so filling a gap cannot steal a later starter.
  roles.forEach((role,index)=>{const player=field.find(p=>!used.has(p.id)&&fieldGroup(p)===role);if(player){chosen[index]={...player,elevenSlot:index+1,elevenRole:roleNames[role],positionFit:'matched'};used.add(player.id);matched++}});
  roles.forEach((role,index)=>{if(chosen[index])return;const remaining=field.filter(p=>!used.has(p.id)),player=remaining.find(p=>!fieldGroup(p))||remaining[0];if(player){const fit=fieldGroup(player)?'improvised':'unknown';chosen[index]={...player,elevenSlot:index+1,elevenRole:roleNames[role],positionFit:fit};used.add(player.id);if(fit==='improvised')improvised++}});
  const eleven=[...(keeper?[{...keeper,elevenSlot:0,elevenRole:'Portero',positionFit:'matched'}]:[]),...chosen.filter(Boolean)];total+=chosen.reduce((sum,p)=>sum+(p?.weekPoints||0),0);const candidate={formation,keeperId:keeper?.id||null,players:eleven,matched,improvised,total,positionsIncomplete:eleven.length<11||eleven.some(p=>p.positionFit!=='matched')};if(!best||matched>best.matched||matched===best.matched&&(improvised<best.improvised||improvised===best.improvised&&total>best.total))best=candidate;
 }
 return best;
}
module.exports={fieldGroup,weeklyFormation};
