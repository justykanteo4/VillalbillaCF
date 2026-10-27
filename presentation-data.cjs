const roles=['Portero','Defensa','Mediocentro','Delantero'];
const stat=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
function preparePresentation(players){return players.map((p,index)=>{const role=p.y>=84?0:p.y>=65?1:p.y>=39?2:3;return {...p,role:roles[role],roleOrder:role,index,goalsConceded:stat(p.goalsConceded),cleanSheets:stat(p.cleanSheets),goals:stat(p.goals),yellow:stat(p.yellow),red:stat(p.red),played:stat(p.played)}}).sort((a,b)=>a.roleOrder-b.roleOrder||b.y-a.y||a.x-b.x||a.index-b.index)}
module.exports={preparePresentation};
