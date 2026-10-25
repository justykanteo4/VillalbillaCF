const CHECK_INTERVAL=15*60*1000;
function createForegroundUpdater(updates,{now=Date.now,isActive=()=>true}={}){
 let lastCheck=now(),running=false;
 return async function check(){
  if(!updates.isEnabled||running||!isActive()||now()-lastCheck<CHECK_INTERVAL)return;
  running=true;lastCheck=now();
  try{const result=await updates.checkForUpdateAsync();if(result.isAvailable)await updates.fetchUpdateAsync()}
  catch{/* Keep the installed version when offline or the free service is unavailable. */}
  finally{running=false}
 };
}
module.exports={createForegroundUpdater,CHECK_INTERVAL};
