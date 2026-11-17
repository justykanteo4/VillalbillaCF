import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import {Button,ErrorText,panel,title,text,theme} from './FantasyUI';
import FantasyClauseLeagueAdmin from './FantasyClauseLeagueAdmin';

// Rendered only for Club administrators in Fantasy Settings.
// The server independently authorizes every listing and modification.
export default function FantasyClauseSettings({request}){
 const [open,setOpen]=useState(false),[leagues,setLeagues]=useState([]),[selected,setSelected]=useState(''),[enabled,setEnabled]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function loadLeagues(){
  setBusy(true);setError('');
  try{
   const data=await request('/admin/leagues/reset',{cache:'reload'});
   setLeagues(data.leagues||[]);
   setOpen(true);
  }catch(e){setError(e.message||'No se pudieron consultar las ligas.')}
  finally{setBusy(false)}
 }
 async function loadStatus(id){
  setSelected(id);setEnabled(null);setBusy(true);setError('');
  try{
   const data=await request('/admin/leagues/'+id+'/clauses',{cache:'reload'});
   setEnabled(data.enabled===true);
  }catch(e){setError(e.message||'No se pudo consultar el estado de las cláusulas.')}
  finally{setBusy(false)}
 }
 const league=leagues.find(item=>item.id===selected);
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Cláusulas de las ligas</Text>
  <Text style={{...text,color:theme.muted}}>Solo administradores. Activa o desactiva las cláusulas de cada liga.</Text>
  <Button secondary disabled={busy} onPress={()=>open?setOpen(false):loadLeagues()}>{open?'Ocultar gestión':'Gestionar cláusulas'}</Button>
  {open&&<>
   <Button secondary disabled={busy} onPress={loadLeagues}>Actualizar ligas</Button>
   {leagues.map(item=><Button key={item.id} secondary disabled={busy} onPress={()=>loadStatus(item.id)}>{selected===item.id?'● ':''}{item.name}</Button>)}
   {busy&&<Text style={text}>Consultando datos de la liga…</Text>}
   {league&&enabled!==null&&!busy&&<FantasyClauseLeagueAdmin key={league.id+':'+String(enabled)} league={{...league,settings:{clausesEnabled:enabled}}} request={request} onUpdated={()=>loadStatus(league.id)}/>}
  </>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
