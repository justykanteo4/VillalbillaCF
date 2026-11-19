import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Switch,Pressable} from 'react-native';
import {api} from './api';
import {auth} from './firebase';

const txt={color:'#dce6f2',lineHeight:22};
async function call(path,options={}){
 const token=await auth?.currentUser?.getIdToken();
 if(!token)throw Error('Inicia sesión como administrador.');
 const response=await api(path,{...options,headers:{'Authorization':'Bearer '+token,...(options.headers||{})},cache:'no-store'});
 if(response?.error)throw Error(response.error);
 return response;
}
export default function AdminKidsSettings({onPreview}){
 const [value,setValue]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false}},[]);
 async function load(){setBusy(true);setError('');try{const data=await call('/api/admin/kids/settings');if(alive.current)setValue(data)}catch(e){if(alive.current)setError(e.message)}finally{if(alive.current)setBusy(false)}}
 async function save(enabled){if(lock.current||!value)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{const data=await call('/api/admin/kids/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled,revision:value.revision})});if(alive.current){setValue(data);setNotice(enabled?'KIDS disponible para todos.':'KIDS oculto para el público.')}}catch(e){if(alive.current){setError(e.message);try{setValue(await call('/api/admin/kids/settings'))}catch{}}}finally{lock.current=false;if(alive.current)setBusy(false)}}
 return <View style={{gap:15,padding:18,borderRadius:16,backgroundColor:'#151f2d'}}>
 <Text style={{...txt,fontSize:22,fontWeight:'900'}}>🎮 Villalbilla KIDS</Text>
 <Text style={txt}>Activa o desactiva la versión infantil para todos los dispositivos. La zona privada del club no cambia.</Text>
 <View style={{flexDirection:'row',gap:14,alignItems:'center'}}><Text style={{...txt,flex:1,fontWeight:'800'}}>Mostrar KIDS al público</Text><Switch accessibilityLabel="Mostrar Villalbilla KIDS al público" disabled={busy||!value} value={value?.enabled===true} onValueChange={save}/></View>
 <Text style={{...txt,color:value?.enabled?'#9be8b6':'#ffce7a'}}>{value?value.enabled?'KIDS activado':'KIDS desactivado':'Cargando configuración…'}</Text>
 <Pressable accessibilityRole="button" onPress={onPreview} style={{backgroundColor:'#1b2e69',padding:13,borderRadius:10}}><Text style={{...txt,textAlign:'center',fontWeight:'800'}}>👀 Ver la versión KIDS</Text></Pressable>
 <Text style={{...txt,color:'#aab8cb',fontSize:12}}>La vista previa solo abre la pantalla pública infantil; no concede permisos de entrenador ni publica fotos de menores.</Text>
 <Pressable accessibilityRole="button" disabled={busy} onPress={load}><Text style={{...txt,color:'#91adff',textAlign:'center'}}>{busy?'Consultando…':'Actualizar estado'}</Text></Pressable>
 {!!notice&&<Text style={{...txt,color:'#9be8b6'}}>{notice}</Text>}{!!error&&<Text accessibilityRole="alert" style={{...txt,color:'#ffc1c9'}}>{error}</Text>}</View>
}
