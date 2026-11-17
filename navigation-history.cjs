function createHistory(initial){let value=initial,previous=[];return {get value(){return value},get length(){return previous.length},push(next){if(Object.is(next,value))return false;previous=[...previous.slice(-49),value];value=next;return true},reset(next){previous=[];value=next},back(){if(!previous.length)return false;value=previous.pop();return true}}}
function handleBack(entries){for(const entry of [...entries].sort((a,b)=>b.priority-a.priority||b.order-a.order))if(entry.action())return true;return false}
module.exports={createHistory,handleBack};
