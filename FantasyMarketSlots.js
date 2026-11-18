import React,{useRef,useState} from 'react';
import {View,Text} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';

export default function FantasyMarketSlots({request}){
 const [leagues,setLeagues]=useState(null),[current,setCurrent]=useState(null);
 const [slots,setSlots]=useState(16),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 async function run(callback){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{await callback()}catch(e){setError(e.message||'No se pudo modificar la cantidad de jugadores del mercado.')}
  finally{lock.current=false;setBusy(false)}
 }
 async function list(){await run(async()=>{const d=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(d.leagues||[])})}
 async function open(id){await run(async()=>{const d=await request('/admin/leagues/'+encodeURIComponent(id)+'/market-slots',{cache:'reload'});setCurrent(d);setSlots(d.slots);setNotice('')})}
 async function save(){if(!current)return;await run(async()=>{
  const d=await request('/admin/leagues/'+encodeURIComponent(current.league.id)+'/market-slots',{method:'POST',body:JSON.stringify({slots,revision:current.revision})});
  setCurrent(d);setSlots(d.slots);setNotice('Cantidad guardada: '+d.slots+' jugadores. Se aplicará en el siguiente refresco del mercado.');
 })}
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Jugadores en el mercado</Text>
  <Text style={text}>Selecciona cuántos jugadores automáticos aparecen por liga. El valor tradicional es 16; puedes ampliarlo hasta 24. Las ventas de los participantes no cuentan en ese límite.</Text>
  <Button secondary disabled={busy} onPress={list}>{leagues?'Actualizar ligas':'Seleccionar liga'}</Button>
  {leagues?.map(l=><Button key={l.id} secondary disabled={busy} onPress={()=>open(l.id)}>{current?.league.id===l.id?'● ':''}{l.name}</Button>)}
  {current&&<View style={{gap:10}}>
   <Text style={{...text,fontWeight:'800'}}>{current.league.name} · {slots} jugadores</Text>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-around'}}>
    <Button secondary disabled={busy||slots<=16} onPress={()=>setSlots(x=>Math.max(16,x-1))}>−</Button>
    <Text style={{...text,fontSize:26,fontWeight:'900'}}>{slots}</Text>
    <Button secondary disabled={busy||slots>=24} onPress={()=>setSlots(x=>Math.min(24,x+1))}>+</Button>
   </View>
   <Text style={{...text,color:theme.muted}}>Si hay pujas activas no se permitirá reducir la cantidad, para proteger las operaciones pendientes.</Text>
   <Button disabled={busy||slots===current.slots} onPress={save}>Guardar cantidad</Button>
  </View>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
