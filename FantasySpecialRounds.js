import {DividerView} from './AppDividers';
import React,{useRef,useState} from 'react';
import {View,Text} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';

export default function FantasySpecialRounds({request}){
 const [leagues,setLeagues]=useState(null),[current,setCurrent]=useState(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 async function run(task){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{await task()}catch(e){setError(e.message||'No se pudo guardar la jornada especial.')}
  finally{lock.current=false;setBusy(false)}
 }
 async function list(){await run(async()=>{const result=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(result.leagues||[]);setNotice('')})}
 async function open(id){await run(async()=>{const result=await request('/admin/leagues/'+encodeURIComponent(id)+'/special-rounds',{cache:'reload'});setCurrent(result);setNotice('')})}
 async function setMultiplier(round,multiplier){
  if(!current||!round.editable)return;
  await run(async()=>{
   await request('/admin/leagues/'+encodeURIComponent(current.league.id)+'/special-rounds',{
    method:'POST',body:JSON.stringify({week:round.week,multiplier,revision:round.revision})
   });
   const latest=await request('/admin/leagues/'+encodeURIComponent(current.league.id)+'/special-rounds',{cache:'reload'});
   setCurrent(latest);
   setNotice(multiplier===2?'Jornada doble activada antes del primer partido.':'Puntuación normal restaurada para la jornada.');
  });
 }
 return <DividerView style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Jornadas especiales</Text>
  <Text style={text}>Marca una jornada de Fantasy con puntuación doble (×2). Se duplican los puntos del once y del entrenador para esa semana. Solo se puede cambiar antes del primer partido; así protegemos las clasificaciones y los premios ya repartidos.</Text>
  <Button secondary disabled={busy} onPress={list}>{leagues?'Actualizar ligas':'Seleccionar liga'}</Button>
  {leagues?.map(league=><Button key={league.id} secondary disabled={busy} onPress={()=>open(league.id)}>{current?.league.id===league.id?'● ':''}{league.name}</Button>)}
  {current&&<View style={{gap:9}}>
   <Text style={{...text,fontWeight:'800'}}>{current.league.name}</Text>
   {!current.weeks?.length&&<Text style={{...text,color:theme.muted}}>Todavía no hay jornadas disponibles para esta liga.</Text>}
   {current.weeks?.map(round=><View key={round.week} style={{borderColor:theme.border,borderWidth:1,borderRadius:9,padding:11,gap:7}}>
    <Text style={{...text,fontWeight:'700'}}>{round.round?'Jornada '+round.round:'Semana '+round.week} · {round.date}</Text>
    <Text style={{...text,color:round.multiplier===2?theme.accent:theme.muted}}>{round.multiplier===2?'Puntuación doble ×2':'Puntuación normal ×1'}{round.editable?'':' · Iniciada o cerrada'}</Text>
    {round.editable&&<Button secondary disabled={busy} onPress={()=>setMultiplier(round,round.multiplier===2?1:2)}>{round.multiplier===2?'Quitar puntuación doble':'Activar puntuación doble'}</Button>}
   </View>)}
  </View>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </DividerView>;
}
