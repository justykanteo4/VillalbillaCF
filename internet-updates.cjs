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
async function manualUpdate(updates,{pending=false,onStatus=()=>{}}={}){if(!updates.isEnabled)return 'unsupported';onStatus('checking');if(pending){onStatus('installing');await updates.reloadAsync();return 'installed'}const result=await updates.checkForUpdateAsync();if(!result.isAvailable)return 'current';onStatus('downloading');await updates.fetchUpdateAsync();onStatus('installing');await updates.reloadAsync();return 'installed'}
module.exports.manualUpdate=manualUpdate;

// Poll while visible. A downloaded update is announced before an automatic restart.
const AUTO_CHECK_INTERVAL=5*60*1000,NOTICE_DELAY=15000;
function createAutoUpdater(updates,{now=Date.now,isActive=()=>true,isEditing=()=>false,canReload=()=>true,beforeReload=async()=>{},hasPending=()=>false,onStatus=()=>{},onError=()=>{}}={}){
 let lastCheck=-Infinity,running=false,pending=false,readyAt=0,applied=false,retryAt=0,wasInactive=false;
 const announce=()=>{pending=true;readyAt=now();onStatus({phase:isEditing()||!canReload()?'waiting':'ready',seconds:Math.ceil(NOTICE_DELAY/1000)})};
 return async function tick(force=false){
  if(!updates.isEnabled||running||applied)return;
  if(!isActive()){wasInactive=true;return}
  if(wasInactive){if(pending)readyAt=now();wasInactive=false}
  running=true;
  try{
   if(!pending&&hasPending())announce();
   if(pending){
    if(now()<retryAt){onStatus({phase:'retry'});return}
    if(isEditing()||!canReload()){readyAt=now();onStatus({phase:'waiting',seconds:15});return}
    const left=Math.max(0,Math.ceil((NOTICE_DELAY-(now()-readyAt))/1000));onStatus({phase:'ready',seconds:left});
    if(left||now()<retryAt)return;
    await beforeReload();if(!isActive()||isEditing()||!canReload()){readyAt=now();return}
    onStatus({phase:'installing',seconds:0});await updates.reloadAsync();applied=true;return;
   }
   if(!force&&now()-lastCheck<AUTO_CHECK_INTERVAL)return;
   lastCheck=now();onStatus({phase:'checking'});
   const result=await updates.checkForUpdateAsync();
   if(!result.isAvailable){onStatus({phase:'idle'});return}
   onStatus({phase:'downloading'});await updates.fetchUpdateAsync();announce();if(!isActive())wasInactive=true;
  }catch(error){onError(error);retryAt=now()+60000;onStatus({phase:pending?'retry':'idle'})}
  finally{running=false}
 };
}
module.exports.createAutoUpdater=createAutoUpdater;module.exports.AUTO_CHECK_INTERVAL=AUTO_CHECK_INTERVAL;module.exports.NOTICE_DELAY=NOTICE_DELAY;
