import {useCallback,useEffect,useRef,useState} from 'react';
import {BackHandler} from 'react-native';
import {createHistory,handleBack} from './navigation-history.cjs';
const handlers=new Set(),screens=new Map();let subscription,order=0;
export function useBackAction(action,priority=0,enabled=true){
 const current=useRef(action);current.current=action;
 useEffect(()=>{if(!enabled)return;const entry={priority,order:++order,action:()=>current.current()};handlers.add(entry);if(!subscription)subscription=BackHandler.addEventListener('hardwareBackPress',()=>handleBack(handlers));return()=>{handlers.delete(entry);if(!handlers.size){subscription?.remove();subscription=null}}},[priority,enabled]);
}
export const navigateBack=()=>handleBack(handlers);
export function clearScreenHistory(){screens.clear()}
export function useScreenHistory(initial,{priority=0,key=null}={}){
 const history=useRef(null);if(!history.current){history.current=key&&screens.has(key)?screens.get(key):createHistory(initial);if(key)screens.set(key,history.current)}
 const [value,setValue]=useState(history.current.value);
 const navigate=useCallback(next=>{const result=typeof next==='function'?next(history.current.value):next;if(history.current.push(result))setValue(result)},[]);
 const reset=useCallback(next=>{const result=typeof next==='function'?next(history.current.value):next;history.current.reset(result);setValue(result)},[]);
 useBackAction(()=>{if(!history.current.back())return false;setValue(history.current.value);return true},priority);
 const back=useCallback(()=>{if(!history.current.back())return false;setValue(history.current.value);return true},[]);
 return [value,navigate,reset,back];
}
