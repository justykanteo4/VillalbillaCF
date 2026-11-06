import {useEffect,useState} from 'react';
let selected=null;const watchers=new Set();
export function selectAccessRequest(uid){selected=uid;for(const update of watchers)update(uid)}
export function useAccessRequestSelection(){const [value,set]=useState(selected);useEffect(()=>{watchers.add(set);set(selected);return()=>watchers.delete(set)},[]);return value}
