function createStartupScheduler({now=Date.now,schedule=setTimeout,cancel=clearTimeout,isActive=()=>true}={}){
 let ready=false,changedAt=now(),preferred=[];
 return {markReady(){if(!ready){ready=true;changedAt=now()}},noteNavigation(ids){changedAt=now();if(ids)preferred=[...new Set(ids.filter(Boolean).map(String))]},preferredTeams:()=>preferred.slice(),
 wait({delay=1200,signal}={}){return new Promise(resolve=>{let timer;const finish=value=>{if(timer!==undefined)cancel(timer);signal?.removeEventListener('abort',abort);resolve(value)},abort=()=>finish(false),check=()=>{if(signal?.aborted||!isActive())return finish(false);const remaining=delay-(now()-changedAt);if(ready&&remaining<=0)return finish(true);timer=schedule(check,ready?Math.max(25,remaining):100)};signal?.addEventListener('abort',abort,{once:true});check()})}};
}
function prioritizeTeams(teams,ids){const order=new Map(ids.map((id,i)=>[String(id),i]));return teams.slice().sort((a,b)=>(order.get(String(a.id))??Infinity)-(order.get(String(b.id))??Infinity))}
module.exports={createStartupScheduler,prioritizeTeams};
