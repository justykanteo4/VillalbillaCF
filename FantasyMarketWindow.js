import React,{useRef,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';

export default function FantasyMarketWindow({request}){
 const [leagues,setLeagues]=useState(null),[current,setCurrent]=useState(null);
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false),pattern=/^$|^\d{4}-\d{2}-\d{2}$/;
 async function run(fn){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await fn()}catch(e){setError(e.message||'No se pudieron guardar las fechas del mercado.')}
  finally{lock.current=false;setBusy(false)}
 }
 async function load(){await run(async()=>{const list=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(list.leagues||[])})}
 async function select(id){await run(async()=>{
  const data=await request('/admin/leagues/'+encodeURIComponent(id)+'/market-window',{cache:'reload'});
  setCurrent(data);setStart(data.startDate||'');setEnd(data.endDate||'');
 })}
 async function save(){if(!current)return;await run(async()=>{
  const data=await request('/admin/leagues/'+encodeURIComponent(current.league.id)+'/market-window',{
   method:'POST',body:JSON.stringify({startDate:start.trim(),endDate:end.trim(),revision:current.revision})
  });
  setCurrent(data);setStart(data.startDate||'');setEnd(data.endDate||'');
  setNotice('Fechas del mercado guardadas. Las operaciones anteriores no se modifican.');
 })}
 const changed=current&&(start.trim()!==current.startDate||end.trim()!==current.endDate);
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Calendario del mercado</Text>
  <Text style={text}>Establece cuándo pueden realizarse nuevos fichajes, pujas, cláusulas y ofertas en cada liga. Las fechas siguen el calendario de Madrid y ambos días se incluyen. Deja un campo vacío para no limitar ese extremo.</Text>
  <Button secondary disabled={busy} onPress={load}>{leagues?'Actualizar ligas':'Seleccionar liga'}</Button>
  {leagues?.map(row=><Button key={row.id} secondary disabled={busy} onPress={()=>select(row.id)}>{current?.league.id===row.id?'● ':''}{row.name}</Button>)}
  {current&&<View style={{gap:10}}>
   <Text style={{...text,fontWeight:'800'}}>{current.league.name} · {current.open?'Mercado abierto':'Mercado cerrado'}</Text>
   <Text style={text}>Desde (AAAA-MM-DD)</Text>
   <TextInput accessibilityLabel="Fecha de apertura del mercado" value={start} onChangeText={setStart} maxLength={10} autoCapitalize="none" editable={!busy} placeholder="2026-11-25" placeholderTextColor={theme.muted} style={{color:theme.text,borderRadius:9,borderWidth:1,borderColor:theme.border,padding:12}}/>
   <Text style={text}>Hasta (AAAA-MM-DD)</Text>
   <TextInput accessibilityLabel="Fecha de cierre del mercado" value={end} onChangeText={setEnd} maxLength={10} autoCapitalize="none" editable={!busy} placeholder="2027-06-30" placeholderTextColor={theme.muted} style={{color:theme.text,borderRadius:9,borderWidth:1,borderColor:theme.border,padding:12}}/>
   <Button disabled={busy||!changed||!pattern.test(start.trim())||!pattern.test(end.trim())} onPress={save}>Guardar calendario del mercado</Button>
   <Button secondary disabled={busy||!current.startDate&&!current.endDate} onPress={()=>{setStart('');setEnd('')}}>Eliminar límites de fechas</Button>
  </View>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
