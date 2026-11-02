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
// Manual checks share the same download-only contract as the automatic controller.
async function manualUpdate(updates,{pending=false,onStatus=()=>{}}={}){
 if(!updates.isEnabled)return 'unsupported';if(pending)return 'ready';onStatus('checking');const result=await updates.checkForUpdateAsync();if(!result.isAvailable)return 'current';onStatus('downloading');const fetched=await updates.fetchUpdateAsync();return fetched?.isNew===false?'current':'ready';
}
module.exports.manualUpdate=manualUpdate;

const AUTO_CHECK_INTERVAL=5*60*1000;
function createAutoUpdater(updates,{now=Date.now,isActive=()=>true,isEditing=()=>false,canReload=()=>true,beforeReload=async()=>{},hasPending=()=>false,onStatus=()=>{},onError=()=>{}}={}){
 let lastCheck=-Infinity,running=false,pending=false,applied=false,reloadFailed=false,lastPhase;
 const emit=phase=>{if(phase!==lastPhase){lastPhase=phase;onStatus({phase})}};
 const announce=()=>emit(isEditing()||!canReload()?'waiting':reloadFailed?'retry':'ready');
 async function tick(force=false){
  if(!updates.isEnabled)return 'unsupported';if(running||applied)return 'busy';if(!isActive())return 'inactive';
  if(!pending&&hasPending())pending=true;
  if(pending){announce();return 'ready'}
  if(!force&&now()-lastCheck<AUTO_CHECK_INTERVAL)return;
  running=true;lastCheck=now();
  try{emit('checking');const result=await updates.checkForUpdateAsync();if(!result.isAvailable){emit('idle');return 'current'}emit('downloading');const fetched=await updates.fetchUpdateAsync();if(fetched?.isNew===false&&!hasPending()){emit('idle');return 'current'}pending=true;if(isActive())announce();return 'ready'}
  catch(error){onError(error);emit('idle');return 'error'}finally{running=false}
 }
 tick.apply=async()=>{
  if(!updates.isEnabled||running||applied)return false;if(!pending&&hasPending())pending=true;if(!pending||!isActive())return false;
  if(isEditing()||!canReload()){announce();return false}running=true;
  try{emit('installing');await beforeReload();if(!isActive()||isEditing()||!canReload()){announce();return false}await updates.reloadAsync();applied=true;return true}
  catch(error){reloadFailed=true;onError(error);emit('retry');return false}finally{running=false}
 };
 return tick;
}
module.exports.createAutoUpdater=createAutoUpdater;module.exports.AUTO_CHECK_INTERVAL=AUTO_CHECK_INTERVAL;
