import React,{useEffect,useState} from 'react';
import {AppState,Platform,Text,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getRandomBytesAsync} from 'expo-crypto';
import {api} from './api';
import {createVisitsClient,createVisitsLifecycle} from './visits-client.cjs';

const visits=createVisitsClient({storage:AsyncStorage,request:api,platform:Platform.OS,randomId:async()=>Array.from(await getRandomBytesAsync(32)).map(value=>value.toString(16).padStart(2,'0')).join('')});
export default function AppVisits(){
 useEffect(()=>{
  visits.start().catch(()=>{});
  const onState=createVisitsLifecycle(visits);
  const listener=AppState.addEventListener('change',state=>{onState(state).catch(()=>{})});
  return()=>listener.remove();
 },[]);
 return null;
}
export function VisitCounter(){
 const [value,setValue]=useState(null),[offline,setOffline]=useState(false);
 useEffect(()=>{
  let active=true;
  const apply=next=>{if(active&&next){setValue(current=>!current||next.total>=current.total?next:current);setOffline(false)}};
  const stop=visits.subscribe(apply);
  visits.readCached().then(next=>{if(active&&next)setValue(current=>current||next)}).catch(()=>{});
  visits.getTotal().then(apply).catch(()=>{if(active)setOffline(true)});
  return()=>{active=false;stop()};
 },[]);
 return <View style={{alignItems:'center',gap:4,paddingVertical:12}}><Text accessibilityLabel={'Visitas totales a la APK y web: '+(value?.total??'no disponible')} style={{color:'#aab8cb',fontSize:12}}>Visitas APK y web · {value?value.total.toLocaleString('es-ES'):'—'}</Text>{offline&&<Text style={{color:'#aab8cb',fontSize:10}}>{value?'Último total guardado':'Contador temporalmente no disponible'}</Text>}</View>;
}
