import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {watchTeamWorkspace,saveTeamWorkspace} from './firebase';
import {mergeChanges} from './workspace-sync.cjs';
import {saveCopy} from './offline';

export default function useTeamWorkspace(teamId,storageKey,initial){
 const [data,setData]=useState(initial),[ready,setReady]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const state=useRef({base:initial,data:initial,dirty:false});
 const persist=()=>AsyncStorage.setItem(storageKey,JSON.stringify({syncVersion:2,...state.current}));
 const set=update=>{
  const current=state.current,next=typeof update==='function'?update(current.data):update;
  if(next===current.data)return;
  state.current={...current,data:next,dirty:true};setData(next);setSaved(false);
  persist().catch(()=>setError('No se pudieron guardar los cambios en este dispositivo.'));
 };
 useEffect(()=>{
  let alive=true,writing=false,stop=()=>{};
  const flush=async()=>{
   if(!alive||writing||!state.current.dirty)return;
   writing=true;
   const sent=state.current;
   try{
    const merged=await saveTeamWorkspace(teamId,sent.data,sent.base);
    if(!alive)return;
    const next=mergeChanges(sent.data,state.current.data,merged);
    const dirty=JSON.stringify(next)!==JSON.stringify(merged);
    state.current={base:merged,data:next,dirty};setData(next);setSaved(!dirty);setError('');await persist();
   }catch(e){if(alive)setError(e.code==='permission-denied'?'Tu cuenta ya no tiene permiso para sincronizar este equipo.':'Cambios guardados en este dispositivo. Se sincronizarán al recuperar la conexión.')}
   finally{writing=false}
  };
  (async()=>{
   try{
    const raw=await AsyncStorage.getItem(storageKey);
    if(!alive)return;
    if(raw){const old=JSON.parse(raw);state.current=old.syncVersion===2?{base:old.base,data:old.data,dirty:old.dirty}:{base:{},data:old,dirty:true}}
    setData(state.current.data);setReady(true);
    stop=watchTeamWorkspace(teamId,remote=>{
     if(!alive||!remote)return;
     const current=state.current,next=current.dirty?mergeChanges(current.base,current.data,remote):remote;
     state.current={base:remote,data:next,dirty:current.dirty};setData(next);setSaved(!current.dirty);persist().catch(()=>{});
     saveCopy('Vestuario '+teamId,remote).catch(()=>{});
    },()=>setError('Usando la copia local. La sincronización se reintentará al conectar.'));
    flush();
   }catch{if(alive)setError('La copia local no se pudo leer. No se sobrescribirán los registros.')}
  })();
  const timer=setInterval(flush,2500),sub=AppState.addEventListener('change',value=>{if(value==='active')flush()});
  return()=>{alive=false;stop();clearInterval(timer);sub.remove()};
 },[teamId,storageKey]);
 return [data,set,ready,saved,error,setError];
}
