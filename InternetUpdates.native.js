import React,{useEffect,useState} from 'react';
import {AppState,View,Text,StyleSheet,Pressable} from 'react-native';
import * as Updates from 'expo-updates';
import {createForegroundUpdater,manualUpdate} from './internet-updates.cjs';

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

export function ManualUpdate(){const {isUpdatePending}=Updates.useUpdates();const [busy,sb]=useState(false),[message,sm]=useState('');async function update(){if(busy)return;sb(true);try{const result=await manualUpdate(Updates,{pending:isUpdatePending,onStatus:status=>sm({checking:'Comprobando actualizaciones…',downloading:'Descargando mejora…',installing:'Aplicando mejora y reiniciando…'}[status])});if(result==='current')sm('Tu app está actualizada.');if(result==='unsupported')sm('Las actualizaciones no están disponibles en esta instalación.')}catch{sm('No se pudo completar la actualización. Comprueba la conexión y vuelve a pulsar.')}finally{sb(false)}}return <View style={{gap:14}}><Text style={s.title}>Actualizar app</Text><Pressable accessibilityRole="button" disabled={busy} onPress={update} style={{padding:16,borderRadius:12,backgroundColor:'#1b2e69'}}><Text style={{color:'#fff',fontWeight:'800'}}>{busy?'Actualizando…':'Actualizar app'}</Text></Pressable><Text style={s.text}>{message||'Comprueba, descarga y aplica las mejoras automáticamente. La app se reiniciará si hay una actualización.'}</Text></View>}
