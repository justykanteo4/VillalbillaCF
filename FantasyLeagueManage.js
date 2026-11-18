import React,{useRef,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';

// Only administrators can open this UI; the server independently verifies the role.
export default function FantasyLeagueManage({request}){
 const [list,setList]=useState(null),[current,setCurrent]=useState(null);
 const [name,setName]=useState(''),[limit,setLimit]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 async function run(task){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{await task()}catch(e){setError(e.message||'No se pudieron modificar los ajustes de la liga.')}finally{lock.current=false;setBusy(false)}
 }
 async function load(){await run(async()=>{const result=await request('/admin/leagues/reset',{cache:'reload'});setList(result.leagues||[]);setNotice('')})}
 async function choose(id){await run(async()=>{
  const result=await request('/admin/leagues/'+encodeURIComponent(id)+'/settings',{cache:'reload'});
  setCurrent(result);setName(result.name);setLimit(String(result.maxMembers));setNotice('');
 })}
 async function save(){if(!current||lock.current)return;await run(async()=>{
  const next=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/settings',{
   method:'POST',body:JSON.stringify({name:name.trim(),maxMembers:Number(limit),expectedName:current.name,expectedMaxMembers:current.maxMembers})
  });
  setCurrent(next);setName(next.name);setLimit(String(next.maxMembers));
  setNotice('Nombre y límite guardados. Las plantillas y los saldos no se han modificado.');
  const result=await request('/admin/leagues/reset',{cache:'reload'});setList(result.leagues||[]);
 })}
 const valid=!!current&&name.trim().length>=3&&name.trim().length<=60&&Number.isInteger(Number(limit))&&Number(limit)>=Math.max(2,current.memberCount)&&Number(limit)<=15&&(current.mode!=='classic'||Number(limit)===current.maxMembers)&&(name.trim()!==current.name||Number(limit)!==current.maxMembers);
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Nombre y participantes</Text>
  <Text style={text}>Cambia el nombre de una liga o su límite de participantes sin borrar datos. Las ligas clásicas mantienen su límite fijo.</Text>
  <Button secondary disabled={busy} onPress={load}>{list?'Actualizar ligas':'Gestionar ligas'}</Button>
  {list?.map(league=><Button key={league.id} secondary disabled={busy} onPress={()=>choose(league.id)}>{current?.id===league.id?'● ':''}{league.name}</Button>)}
  {current&&<View style={{gap:10,padding:12,backgroundColor:theme.header,borderRadius:10}}>
   <Text style={text}>Liga: {current.name}</Text>
   <Text style={text}>Nuevo nombre</Text>
   <TextInput accessibilityLabel="Nombre de liga" value={name} onChangeText={setName} editable={!busy} maxLength={60} style={{padding:12,borderWidth:1,borderColor:theme.border,borderRadius:8,color:theme.text}}/>
   <Text style={text}>Máximo de participantes (2 a 15)</Text>
   <TextInput accessibilityLabel="Límite de participantes" value={limit} onChangeText={setLimit} editable={!busy&&current.mode!=='classic'} keyboardType="number-pad" style={{padding:12,borderWidth:1,borderColor:theme.border,borderRadius:8,color:theme.text}}/>
   <Text style={{...text,color:theme.muted}}>Inscritos actualmente: {current.memberCount}. Nunca se expulsará a nadie por cambiar el límite.</Text>
   {current.mode==='classic'&&<Text style={{...text,color:theme.muted}}>Liga clásica: límite fijo; puedes cambiar el nombre.</Text>}
   <Button disabled={busy||!valid} onPress={save}>{busy?'Guardando…':'Guardar cambios de liga'}</Button>
  </View>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
