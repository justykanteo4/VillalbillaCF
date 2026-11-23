import {DividerView} from './AppDividers';
import appTheme from './app-theme';
import React,{useState} from 'react';
import {View,Text} from 'react-native';
import {Button,ErrorText,text,title,panel,theme} from './FantasyUI';

export default function FantasyAdminActivity({request}){
 const [events,setEvents]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function refresh(){
  if(busy)return;setBusy(true);setError('');
  try{const data=await request('/admin/activity',{cache:'reload'});setEvents(data.events||[])}
  catch(e){setError(e.message||'No se pudo cargar la actividad.')}
  finally{setBusy(false)}
 }
 return <DividerView style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Actividad reciente</Text>
  <Text style={{...text,color:theme.muted}}>Historial de cambios de configuración de ligas y puntuaciones. Solo visible para el Club.</Text>
  <Button secondary onPress={refresh} disabled={busy}>{busy?'Consultando…':'Consultar actividad'}</Button>
  {events?.length===0&&<Text style={text}>No hay cambios registrados.</Text>}
  {events?.map((item,index)=><DividerView key={item.type+':'+item.scope+':'+item.createdAt+':'+index} style={{gap:4,padding:10,borderTopWidth:appTheme.lineWidth,borderColor:theme.border}}>
   <Text style={{...text,fontWeight:'800'}}>{item.type==='scoring'?'Puntuaciones':'Configuración de liga'} · {item.summary}</Text>
   <Text style={{...text,color:theme.muted}}>{new Date(item.createdAt).toLocaleString('es-ES')} · {item.actor}</Text>
  </DividerView>)}
  <ErrorText>{error}</ErrorText>
 </DividerView>;
}
