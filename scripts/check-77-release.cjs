// Mandatory release gate for the one-time 77-settings delivery.
// An item is approved only after its UI, backend, permissions and tests are validated.
const {features}=require('../settings-upgrade-catalog.cjs');
const approved=require('../settings-release-approved.json');
const valid=new Set(features.map(f=>f.id));
if(!Array.isArray(approved)||approved.some(id=>!valid.has(id))||new Set(approved).size!==approved.length){
 console.error('Release approvals contain invalid or duplicate IDs.');process.exit(1);
}
const pending=features.filter(item=>!approved.includes(item.id));
if(pending.length){
 console.error('Unfinished settings: '+pending.length+' of '+features.length+'.');
 for(const item of pending)console.error(item.id+' · '+item.label);
 console.error('Release blocked. Do not publish a partial update.');
 process.exit(1);
}
console.log('All 77 settings approved for the combined release.');
