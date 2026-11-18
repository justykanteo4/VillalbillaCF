import React,{useState} from 'react';
import {View,Text,Share,Platform} from 'react-native';
import {Button,ErrorText,text,title,panel,theme} from './FantasyUI';

export default function FantasyAdminExport({request}){
 const [leagues,setLeagues]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[prepared,setPrepared]=useState('');
 async function load(){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const data=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(data.leagues||[])}
  catch(e){setError(e.message||'No se pudo consultar la lista de ligas.')}
  finally{setBusy(false)}
 }
 async function exportLeague(league){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const data=await request('/admin/leagues/'+encodeURIComponent(league.id)+'/export',{cache:'reload'});
   const formatted=JSON.stringify(data,null,2);setPrepared(formatted);
   if(Platform.OS==='web'){
    if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){
     await navigator.clipboard.writeText(formatted);
     setNotice('Configuración copiada. Guárdala en un lugar privado.');
    }else setNotice('Selecciona y copia la configuración que aparece debajo.');
   }else{
    await Share.share({title:'Configuración de '+league.name,message:formatted});
    setNotice('Se abrió el menú de compartir. Elige dónde guardar tu copia.');
   }
  }catch(e){setError(e.message||'No se pudo preparar la exportación.')}
  finally{setBusy(false)}
 }
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Exportar configuración de ligas</Text>
  <Text style={text}>Copia las reglas de una liga, su nombre y el número de participantes. Por privacidad, no se incluyen correos, nombres de jugadores ni códigos de invitación.</Text>
  <Button secondary onPress={load} disabled={busy}>{busy?'Consultando…':'Elegir liga para exportar'}</Button>
  {leagues?.map(league=><Button secondary key={league.id} disabled={busy} onPress={()=>exportLeague(league)}>{'Exportar · '+league.name}</Button>)}
  {!!notice&&<Text style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
  {!!prepared&&<Text selectable style={{...text,color:theme.muted,fontSize:11}}>{prepared}</Text>}
 </View>;
}
