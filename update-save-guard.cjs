const pending=new Set(),failed=new Set();
function trackLocalSave(key,promise){const work=Promise.resolve(promise);pending.add(work);work.then(()=>failed.delete(key),()=>failed.add(key)).finally(()=>pending.delete(work));return work}
function canReload(){return pending.size===0&&failed.size===0}
async function finishLocalSaves(){while(pending.size)await Promise.allSettled([...pending]);if(failed.size)throw Error('No se pudieron guardar los cambios locales.')}
module.exports={trackLocalSave,canReload,finishLocalSaves};
