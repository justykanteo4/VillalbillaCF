import React,{useEffect,useRef,useState} from 'react';
import {AppState,View,Text,StyleSheet,Pressable,Keyboard,Modal} from 'react-native';
import {canReload,finishLocalSaves} from './update-save-guard.cjs';
import * as Updates from 'expo-updates';
import {createAutoUpdater,manualUpdate} from './internet-updates.cjs';

export default function InternetUpdates(){
 const update=Updates.useUpdates(),pending=useRef(false),[status,setStatus]=useState({phase:'idle'});pending.current=!!update.isUpdatePending;
 useEffect(()=>{
  if(!Updates.isEnabled)return;
  let mounted=true,editing=!!Keyboard.isVisible?.();
  const tick=createAutoUpdater(Updates,{isActive:()=>mounted&&AppState.currentState==='active',isEditing:()=>editing,canReload,beforeReload:finishLocalSaves,hasPending:()=>pending.current,onStatus:value=>{if(mounted)setStatus(value)}});
  void tick(true);const timer=setInterval(()=>void tick(),1000);
  const app=AppState.addEventListener('change',state=>{void tick(state==='active')}),show=Keyboard.addListener('keyboardDidShow',()=>{editing=true}),hide=Keyboard.addListener('keyboardDidHide',()=>{editing=false});
  return()=>{mounted=false;clearInterval(timer);app.remove();show.remove();hide.remove()};
 },[]);
 if(!['downloading','ready','waiting','installing','retry'].includes(status.phase))return null;
 const message=status.phase==='downloading'?'Nueva actualización: descargando…':status.phase==='waiting'?'Actualización lista. Se aplicará al terminar de escribir y guardar.':status.phase==='installing'?'Aplicando actualización. La app se reiniciará…':status.phase==='retry'?'Actualización descargada. Reintentando aplicarla…':`Actualización lista. Se aplicará automáticamente en ${status.seconds} s.`;
 if(status.phase==='ready'||status.phase==='installing')return <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={()=>{}}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.65)'}}><View accessibilityLiveRegion="polite" style={{padding:24,borderRadius:18,backgroundColor:'#153451',borderWidth:1,borderColor:'#71c4ef',gap:12}}><Text style={{fontSize:23,fontWeight:'800',color:'#fff'}}>Actualización de la app</Text><Text style={{color:'#fff',lineHeight:24}}>{message}</Text><Text style={{color:'#bbd3e7',lineHeight:21}}>No necesitas pulsar ningún botón. Se abrirá de nuevo automáticamente.</Text></View></View></Modal>;
 return <View pointerEvents="none" accessibilityLiveRegion="polite" style={{position:'absolute',top:52,left:14,right:14,zIndex:9999,elevation:30,padding:14,borderRadius:12,backgroundColor:'#173b5c',borderWidth:1,borderColor:'#71c4ef'}}><Text style={{color:'#fff',fontWeight:'700',lineHeight:21}}>{message}</Text></View>;
}

export function UpdateStatus(){
 const {isUpdatePending,isDownloading}=Updates.useUpdates();
 if(!Updates.isEnabled)return null;
 return <View style={s.card}>
  <Text style={s.title}>Actualizaciones por Internet</Text>
  <Text style={s.text}>{isDownloading?'Descargando mejoras…':isUpdatePending?'Hay una mejora descargada. La app avisará antes de aplicarla automáticamente.':'La app comprueba las mejoras al abrir y cada cinco minutos mientras está abierta. Las descarga, avisa y las aplica automáticamente. Sin conexión puedes seguir usando la versión instalada.'}</Text>
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'#151f2d',borderRadius:14,borderWidth:1,borderColor:'#2d3e52',padding:16,gap:8},title:{fontSize:16,fontWeight:'800',color:'#fff'},text:{fontSize:13,lineHeight:20,color:'#aab8cb'}});

export function ManualUpdate(){const {isUpdatePending}=Updates.useUpdates();const [busy,sb]=useState(false),[message,sm]=useState('');async function update(){if(busy)return;sb(true);try{const result=await manualUpdate(Updates,{pending:isUpdatePending,onStatus:status=>sm({checking:'Comprobando actualizaciones…',downloading:'Descargando mejora…',installing:'Aplicando mejora y reiniciando…'}[status])});if(result==='current')sm('Tu app está actualizada.');if(result==='unsupported')sm('Las actualizaciones no están disponibles en esta instalación.')}catch{sm('No se pudo completar la actualización. Comprueba la conexión y vuelve a pulsar.')}finally{sb(false)}}return <View style={{gap:14}}><Text style={s.title}>Actualizar app</Text><Pressable accessibilityRole="button" disabled={busy} onPress={update} style={{padding:16,borderRadius:12,backgroundColor:'#1b2e69'}}><Text style={{color:'#fff',fontWeight:'800'}}>{busy?'Actualizando…':'Actualizar app'}</Text></Pressable><Text style={s.text}>{message||'Comprueba, descarga y aplica las mejoras automáticamente. La app se reiniciará si hay una actualización.'}</Text></View>}
