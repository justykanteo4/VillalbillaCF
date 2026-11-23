import {DividerView} from './AppDividers';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Switch} from 'react-native';
import {Button,ErrorText,panel,title,text,theme} from './FantasyUI';

export default function FantasyLeagueCreationSettings({request}){
 const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;load();return()=>{alive.current=false}},[]);
 async function load(){
  setBusy(true);setError('');
  try{const next=await request('/admin/league-creation',{cache:'reload'});if(alive.current)setState(next)}
  catch(e){if(alive.current)setError(e.message||'No se pudo consultar este ajuste.')}
  finally{if(alive.current)setBusy(false)}
 }
 async function update(enabled){
  if(lock.current||!state)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const next=await request('/admin/league-creation',{method:'POST',body:JSON.stringify({enabled,revision:state.revision})});
   if(alive.current){setState(next);setNotice(enabled?'Los participantes ya pueden crear ligas nuevas.':'Creación desactivada; las ligas existentes siguen funcionando.')}
  }catch(e){
   if(alive.current){setError(e.message||'No se pudo cambiar el ajuste.');try{setState(await request('/admin/league-creation',{cache:'reload'}))}catch{}}
  }finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 return <DividerView style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Crear nuevas ligas</Text>
  <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
   <Text style={{...text,flex:1,fontWeight:'800'}}>Permitir crear ligas nuevas</Text>
   <Switch accessibilityLabel="Permitir crear nuevas ligas de Fantasy" disabled={busy||!state} value={state?.enabled===true} onValueChange={update} trackColor={{false:theme.border,true:theme.accent}}/>
  </View>
  <Text style={text}>{state?.enabled?'Activo: aparece Crear nueva liga en el inicio de Fantasy.':'Desactivado: no se pueden crear ligas nuevas.'}</Text>
  <Text style={{...text,color:theme.muted}}>Solo el club puede cambiar esta opción. No borra ni interrumpe ligas existentes.</Text>
  {!!notice&&<Text style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
  <Button secondary disabled={busy} onPress={load}>Actualizar configuración</Button>
 </DividerView>;
}
