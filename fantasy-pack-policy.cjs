function packState(count){return {index:0,count:Math.max(0,count|0),phase:count>0?'sealed':'done'}}
function packStep(state,event){
 if(event==='open'&&state.phase==='sealed')return {...state,phase:'opening'};
 if(event==='revealed'&&state.phase==='opening')return {...state,phase:'revealed'};
 if(event==='next'&&state.phase==='revealed')return state.index+1<state.count?{...state,index:state.index+1,phase:'sealed'}:{...state,phase:'done'};
 return state;
}
function createRevealQueue(){const entries=new Map(),listeners=new Set();let winner=null,order=0;const publish=()=>{const next=[...entries].sort((a,b)=>b[1].priority-a[1].priority||a[1].order-b[1].order)[0]?.[0]||null;if(winner!==next){winner=next;for(const f of listeners)f()}};return {subscribe:f=>{listeners.add(f);return()=>listeners.delete(f)},snapshot:()=>winner,request:(id,priority)=>{entries.set(id,{priority,order:++order});publish();return()=>{entries.delete(id);publish()}}}}
module.exports={packState,packStep,createRevealQueue};
