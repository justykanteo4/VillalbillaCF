import {useEffect,useId,useSyncExternalStore} from 'react';
import {createRevealQueue} from './fantasy-pack-policy.cjs';
const queue=createRevealQueue();
export function useFantasyRevealSlot(enabled,priority){const id=useId(),winner=useSyncExternalStore(queue.subscribe,queue.snapshot,()=>null);useEffect(()=>{if(enabled)return queue.request(id,priority)},[id,enabled,priority]);return enabled&&winner===id}
export function useFantasyRevealVisible(){return !!useSyncExternalStore(queue.subscribe,queue.snapshot,()=>null)}
