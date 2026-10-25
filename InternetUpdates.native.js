import React,{useEffect} from 'react';
import {AppState,View,Text,StyleSheet} from 'react-native';
import * as Updates from 'expo-updates';
import {createForegroundUpdater} from './internet-updates.cjs';

export default function InternetUpdates(){
 useEffect(()=>{
  if(!Updates.isEnabled)return;
  let previous=AppState.currentState;
  const check=createForegroundUpdater(Updates,{isActive:()=>AppState.currentState==='active'});
  const listener=AppState.addEventListener('change',next=>{
   const foreground=next==='active'&&previous!=='active';previous=next;
   if(foreground)void check();
  });
  // Expo checks on launch natively. Foreground checks only download; never interrupt edits.
  return()=>listener.remove();
 },[]);
 return null;
}
export function UpdateStatus(){
 const {isUpdatePending,isDownloading}=Updates.useUpdates();
 if(!Updates.isEnabled)return null;
 return <View style={s.card}>
  <Text style={s.title}>Actualizaciones por Internet</Text>
  <Text style={s.text}>{isDownloading?'Descargando mejoras…':isUpdatePending?'Hay una mejora descargada. Se aplicará al volver a abrir la app.':'La app descarga las mejoras al abrirse y las aplica al volver a abrirla, sin reinstalar. Puedes seguir utilizándola sin conexión.'}</Text>
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'#151f2d',borderRadius:14,borderWidth:1,borderColor:'#2d3e52',padding:16,gap:8},title:{fontSize:16,fontWeight:'800',color:'#fff'},text:{fontSize:13,lineHeight:20,color:'#aab8cb'}});
