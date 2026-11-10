import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {api} from './api';
import {auth} from './firebase';
import {readCopy,saveCopy} from './offline';
import {mergeAdjustments} from './goalkeeper-adjustments.cjs';
const path='/api/goalkeeper-adjustments',listeners=new Set();let snapshot={adjustments:[],loaded:false,error:false},job=null,checkedAt=0;
function publish(value){snapshot={...snapshot,...value,adjustments:mergeAdjustments(snapshot.adjustments,value.adjustments||[])};for(const listener of listeners)listener(snapshot)}
async function refresh(force=false){if(job)return job;if(!force&&Date.now()-checkedAt<60000)return snapshot;job=(async()=>{try{const old=await readCopy(path);if(old?.data?.adjustments)publish({...old.data,loaded:true});const result=await api(path,{cache:force?'reload':undefined,onUpdate:value=>publish({...value,loaded:true})});if(result.error)throw Error('Ajustes pendientes de actualizar');publish({...result,loaded:true,error:false});checkedAt=Date.now();return snapshot}catch{publish({error:true});return snapshot}finally{job=null}})();return job}
export function useKeeperAdjustments(){const [state,set]=useState(snapshot);useEffect(()=>{listeners.add(set);refresh();const interval=setInterval(()=>refresh(),60000),sub=AppState.addEventListener('change',value=>{if(value==='active')refresh(true)});return()=>{listeners.delete(set);clearInterval(interval);sub.remove()}},[]);return {...state,refresh:()=>refresh(true),change:async value=>{if(!auth?.currentUser)throw Error('Inicia sesión como entrenador.');const token=await auth.currentUser.getIdToken();try{const result=await api(path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(value)});publish({...result,loaded:true,error:false});checkedAt=Date.now();await saveCopy(path,{adjustments:snapshot.adjustments}).catch(()=>{});return result}catch(e){await refresh(true);throw e}}}}
