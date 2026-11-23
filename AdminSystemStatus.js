import {SectionStack} from './AppDividers';
import appTheme from './app-theme';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {auth} from './firebase';
import {api} from './api';

const labels={club:'Club y actas',fantasy:'Ligas Fantasy',notifications:'Notificaciones'};
const text={color:'#dce6f2',lineHeight:22};
export default function AdminSystemStatus(){
 const [state,setState]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function refresh(){
  setLoading(true);setError('');
  try{
   if(!auth.currentUser)throw Error('Debes iniciar sesión.');
   const uid=auth.currentUser.uid,token=await auth.currentUser.getIdToken();
   if(auth.currentUser?.uid!==uid)throw Error('La cuenta ha cambiado.');
   setState(await api('/api/admin/system-status',{headers:{Authorization:'Bearer '+token},cache:'no-store'}));
  }catch(e){setError(e.message||'No se pudo comprobar el estado del servidor.')}finally{setLoading(false)}
 }
 useEffect(()=>{refresh()},[]);
 return <SectionStack style={{gap:14}}>
  <Text accessibilityRole="header" style={{...text,fontSize:24,fontWeight:'800'}}>Estado del servidor</Text>
  <Text style={{...text,color:'#aab8cb'}}>Comprobación en directo de los servicios de Cloudflare. Reservado a administradores; no muestra datos privados.</Text>
  <Pressable accessibilityRole="button" disabled={loading} onPress={refresh} style={{backgroundColor:appTheme.selected,borderRadius:12,padding:14,opacity:loading?0.5:1}}><Text style={text}>{loading?'Comprobando…':'Volver a comprobar'}</Text></Pressable>
  {!!error&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{error}</Text>}
  {state&&<><Text style={{...text,color:state.healthy?'#8ce2a8':'#ffc1c9',fontWeight:'800'}}>{state.healthy?'Todos los servicios responden':'Hay servicios que no responden'}</Text>
  {(state.checks||[]).map(item=><View key={item.name} style={{backgroundColor:appTheme.panel,padding:14,borderRadius:12}}>
   <Text style={{...text,fontWeight:'700'}}>{item.ok?'✓':'!'} {labels[item.name]||item.name}</Text>
   <Text style={{...text,color:item.ok?'#8ce2a8':'#ffc1c9'}}>{item.ok?'Operativo':'No disponible'}</Text>
  </View>)}
  <Text style={{...text,color:'#aab8cb'}}>Última comprobación: {new Date(state.checkedAt).toLocaleString('es-ES')}</Text></>}
 </SectionStack>;
}
