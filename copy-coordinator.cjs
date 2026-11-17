// Serialize background imports with normal cache writes for the same resource.
function createCopyCoordinator(device){
 const writes=new Map();
 function run(key,action){const work=(writes.get(key)||Promise.resolve()).catch(()=>{}).then(action);writes.set(key,work);const clear=()=>{if(writes.get(key)===work)writes.delete(key)};work.then(clear,clear);return work}
 return {readCopy:device.readCopy,listCopies:device.listCopies,saveCopy:(key,data,savedAt)=>run(key,()=>device.saveCopy(key,data,savedAt)),updateCopy:(key,change)=>run(key,async()=>{const next=await change(await device.readCopy(key));if(!next)return false;await device.saveCopy(key,next.data,next.savedAt);return true})};
}
module.exports={createCopyCoordinator};
