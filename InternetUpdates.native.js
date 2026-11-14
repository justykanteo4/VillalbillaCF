import {backgroundTurn} from './startup-work';
import {recordDiagnostic} from './diagnostics';
import React,{useEffect,useRef,useState} from 'react';
import {AppState,View,Text,StyleSheet,Pressable,Keyboard,Modal} from 'react-native';
import {canReload,finishLocalSaves} from './update-save-guard.cjs';
import * as Updates from 'expo-updates';
import {createAutoUpdater} from './internet-updates.cjs';
let controller=null;
export default function InternetUpdates(){
 const update=Updates.useUpdates(),pending=useRef(false),[status,setStatus]=useState({phase:'idle'});pending.current=!!update.isUpdatePending;
 useEffect(()=>{
  if(!Updates.isEnabled)return;
  const abort=new AbortController();let automaticReady=false,mounted=true,editing=!!Keyboard.isVisible?.();
  const tick=createAutoUpdater(Updates,{isActive:()=>mounted&&AppState.currentState==='active',isEditing:()=>editing,canReload,beforeReload:finishLocalSaves,hasPending:()=>pending.current,onStatus:value=>{if(mounted)setStatus(value)},onError:()=>recordDiagnostic({category:'actualizaciones',code:'UPDATE'})});controller=tick;
  const start=async()=>{if(!await backgroundTurn({delay:6000,signal:abort.signal})||!mounted)return;automaticReady=true;void tick(true)};void start();const timer=setInterval(()=>{if(automaticReady)void tick()},1000);
  const app=AppState.addEventListener('change',state=>{if(state==='active'){automaticReady=false;void start()}else automaticReady=false}),show=Keyboard.addListener('keyboardDidShow',()=>{editing=true}),hide=Keyboard.addListener('keyboardDidHide',()=>{editing=false;if(automaticReady)void tick()});
  return()=>{mounted=false;abort.abort();if(controller===tick)controller=null;clearInterval(timer);app.remove();show.remove();hide.remove()};
 },[]);
 if(!['ready','installing','retry'].includes(status.phase))return null;
 const installing=status.phase==='installing';
 return <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={()=>{}}><View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.75)'}}><View accessibilityLiveRegion="polite" style={{padding:24,borderRadius:18,backgroundColor:'#153451',borderWidth:1,borderColor:'#71c4ef',gap:16}}><Text accessibilityRole="header" style={{fontSize:24,fontWeight:'800',color:'#fff'}}>Actualización obligatoria</Text><Text style={{color:'#fff',lineHeight:24}}>{installing?'Aplicando la actualización… La app se reiniciará.':status.phase==='retry'?'No se pudo aplicar la actualización. Está descargada; pulsa Actualizar para reintentarlo.':'La actualización y sus datos incluidos ya están descargados. Actualiza para continuar.'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Actualizar" disabled={installing} onPress={()=>void controller?.apply()} style={{padding:18,borderRadius:12,backgroundColor:'#b42122',alignItems:'center',opacity:installing?0.5:1}}><Text style={{fontSize:19,fontWeight:'900',color:'#fff'}}>{installing?'Actualizando…':'Actualizar'}</Text></Pressable></View></View></Modal>;
}
export function UpdateStatus(){if(!Updates.isEnabled)return null;return <View style={s.card}><Text style={s.title}>Actualizaciones por Internet</Text><Text style={s.text}>Las mejoras y los datos incluidos se descargan sin interrumpirte. Cuando están listos aparece un único aviso obligatorio para aplicarlos. Sin conexión se conserva la versión instalada.</Text></View>}
const s=StyleSheet.create({card:{backgroundColor:'#151f2d',borderRadius:14,borderWidth:1,borderColor:'#2d3e52',padding:16,gap:8},title:{fontSize:16,fontWeight:'800',color:'#fff'},text:{fontSize:13,lineHeight:20,color:'#aab8cb'}});
export function ManualUpdate(){const [busy,sb]=useState(false),[message,sm]=useState('');async function check(){if(busy)return;sb(true);try{const result=controller?await controller(true):'unsupported';sm(result==='current'?'Tu app está actualizada.':result==='ready'?'Actualización descargada. Termina de escribir y guardar para aplicarla desde el aviso.':result==='unsupported'?'Las actualizaciones no están disponibles en esta instalación.':result==='error'?'No se pudo descargar. Comprueba la conexión y vuelve a intentarlo.':'La comprobación ya está en curso.')}catch{sm('No se pudo comprobar. Inténtalo de nuevo.')}finally{sb(false)}}return <View style={{gap:14}}><Text style={s.title}>Actualizar app</Text><Pressable accessibilityRole="button" disabled={busy} onPress={check} style={{padding:16,borderRadius:12,backgroundColor:'#1b2e69'}}><Text style={{color:'#fff',fontWeight:'800'}}>{busy?'Comprobando…':'Buscar actualizaciones'}</Text></Pressable><Text style={s.text}>{message||'Las actualizaciones se descargan silenciosamente mientras usas la app. Solo aparece un aviso obligatorio cuando están listas para aplicar. El sistema puede pausar la descarga si cierras la app; se vuelve a comprobar al abrirla.'}</Text></View>}
