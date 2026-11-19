import React,{useState} from 'react';
import {Text,Pressable,View} from 'react-native';
import {loadTeamCalendar} from './team-calendar';
import RffmCrest from './RffmCrest';
import {Button,panel,text,title,theme} from './FantasyUI';

// Reutiliza la caché de los calendarios del Club. No descarga todos los
// escudos de la liga ni hace peticiones hasta que el usuario abre esta sección.
export default function FantasyOfficialMatches({teamId}){
 const [opened,setOpened]=useState(false),[team,setTeam]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function toggle(){
  if(opened){setOpened(false);return}
  setOpened(true);
  if(!teamId)return;
  setLoading(true);setError('');
  try{const value=await loadTeamCalendar(String(teamId),{force:true,onUpdate:value=>setTeam(value)});setTeam(value);if(value.error)setError('Se muestra el calendario guardado.')}
  catch{setError('No se han podido cargar los partidos de la Federación.')}
  finally{setLoading(false)}
 }
 if(!teamId)return null;
 const now=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});
 const fixtures=(team?.fixtures||[]).filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date)).filter(m=>m.date>=new Date(Date.now()-14*86400000).toISOString().slice(0,10)).slice(0,8);
 return <View style={panel}>
  <Text style={{...title,fontSize:19}}>Partidos oficiales · RFFM</Text>
  <Text style={{...text,color:theme.muted}}>Calendario de tu categoría con los escudos que publique la Federación.</Text>
  <Button secondary onPress={toggle}>{opened?'Ocultar partidos':'Ver partidos y escudos'}</Button>
  {opened&&<View style={{gap:12}}>
   {loading&&<Text style={text}>Cargando calendario…</Text>}
   {!!error&&<Text style={{...text,color:theme.muted}}>{error}</Text>}
   {team&&!fixtures.length&&<Text style={text}>No hay partidos publicados para este periodo.</Text>}
   {fixtures.map(m=><View key={m.id} style={{gap:7,padding:11,borderColor:theme.border,borderWidth:1,borderRadius:12,backgroundColor:theme.header}}>
    <Text style={{...text,color:theme.muted,fontSize:12}}>Jornada {m.round} · {m.date.split('-').reverse().join('/')} · {m.time||'Hora por confirmar'}</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
     <RffmCrest uri={m.homeCrest} name={m.home} size={36}/>
     <Text style={{...text,flex:1}}>{m.home}</Text>
    </View>
    <Text style={{...text,textAlign:'center',fontWeight:'900',color:theme.accent}}>{Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore)?m.homeScore+' — '+m.awayScore:'VS'}</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
     <RffmCrest uri={m.awayCrest} name={m.away} size={36}/>
     <Text style={{...text,flex:1}}>{m.away}</Text>
    </View>
   </View>)}
  </View>}
 </View>;
}
