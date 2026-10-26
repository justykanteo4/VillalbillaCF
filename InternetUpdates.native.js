import React,{useEffect,useState} from 'react';
import {AppState,View,Text,StyleSheet,Pressable,Linking} from 'react-native';
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

export function ManualUpdate(){const {isUpdatePending}=Updates.useUpdates();const [busy,sb]=useState(false),[message,sm]=useState(''),[pending,sp]=useState(false);async function check(){sb(true);try{if(!Updates.isEnabled){sm('Usa el APK para actualizar esta instalación.');return}const result=await Updates.checkForUpdateAsync();if(result.isAvailable){await Updates.fetchUpdateAsync();sp(true);sm('Mejora descargada. Pulsa Aplicar para reiniciar la app.')}else if(isUpdatePending){sp(true);sm('Hay una mejora descargada lista para aplicar.')}else sm('Tu app está actualizada.')}catch{sm('No se pudo comprobar. Revisa la conexión y vuelve a intentarlo.')}finally{sb(false)}}return <View style={{gap:14}}><Text style={s.title}>Actualizar app / APK</Text><Pressable accessibilityRole="button" disabled={busy} onPress={check}><Text style={s.text}>{busy?'Buscando actualización…':'Buscar actualización por Internet'}</Text></Pressable>{(pending||isUpdatePending)&&<Pressable accessibilityRole="button" onPress={()=>Updates.reloadAsync().catch(()=>sm('Cierra y abre la app para aplicar la mejora.'))}><Text style={s.text}>Aplicar y reiniciar app</Text></Pressable>}<Text style={s.text}>{message}</Text><Text style={s.text}>Si necesitas reinstalar o renovar componentes del dispositivo:</Text>{[['Descargar APK',''],['APK con firma Expo','-Expo']].map(([label,suffix])=><Pressable accessibilityRole="link" key={label} onPress={()=>Linking.openURL('https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.12-cache-avisos/VillalbillaCF-0.1.12'+suffix+'.apk').catch(()=>sm('No se pudo abrir la descarga.'))}><Text style={s.text}>{label}</Text></Pressable>)}</View>}
