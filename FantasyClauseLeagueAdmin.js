import {DividerView} from './AppDividers';
import React,{useState} from 'react';
import {View,Text} from 'react-native';
import {Button,ErrorText,panel,title,text,theme} from './FantasyUI';
export default function FantasyClauseLeagueAdmin({league,request,onUpdated=()=>{}}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!league)return null;
 const active=league.settings?.clausesEnabled===true;
 async function toggle(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   await request('/admin/leagues/'+league.id+'/clauses',{method:'POST',body:JSON.stringify({enabled:!active})});
   await onUpdated();
  }catch(e){setError(e.message||'No se ha podido actualizar la liga.')}
  finally{setBusy(false)}
 }
 return <DividerView style={{...panel,gap:10}}>
  <Text style={{...title,fontSize:18}}>Club · Cláusulas de esta liga</Text>
  <Text style={text}>{active?'Activadas':'Desactivadas'}</Text>
  <Text style={{...text,color:theme.muted,fontSize:13}}>Si las activas, los participantes podrán aumentar o pagar cláusulas. Los jugadores fichados estarán protegidos dos jornadas; no se permiten clausulazos 24 horas antes del cierre.</Text>
  <Button secondary disabled={busy} onPress={toggle}>{busy?'Guardando…':active?'Desactivar cláusulas':'Activar cláusulas'}</Button>
  <ErrorText>{error}</ErrorText>
 </DividerView>
}
