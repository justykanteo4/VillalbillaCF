import React,{useEffect,useState,useRef} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';
import {ruleFields} from './fantasy-leagues.cjs';
import {Button,ErrorText,text,panel,theme} from './FantasyUI';

const editable=ruleFields.filter(r=>!['captain','idealXI'].includes(r.key));
export default function FantasyPointsSettings({request}){
 const [values,setValues]=useState(null),[original,setOriginal]=useState(null),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false),active=useRef(true);
 useEffect(()=>{active.current=true;load();return()=>{active.current=false}},[]);
 async function load(){
  setBusy(true);setError('');setNotice('');
  try{
   const data=await request('/admin/points',{cache:'reload'});
   if(active.current){setValues(Object.fromEntries(editable.map(r=>[r.key,String(data.points[r.key])])));setOriginal(data.points);setRevision(data.revision)}
  }catch(e){if(active.current)setError(e.message||'No se pudieron cargar los puntos.')}
  finally{if(active.current)setBusy(false)}
 }
 const parsed=values&&Object.fromEntries(editable.map(r=>[r.key,Number(values[r.key])]));
 const valid=!!values&&editable.every(r=>/^-?\d+$/.test(values[r.key]?.trim()||'')&&Number.isInteger(parsed[r.key])&&parsed[r.key]>=-20&&parsed[r.key]<=20);
 const changed=valid&&editable.some(r=>parsed[r.key]!==original?.[r.key]);
 async function save(){
  if(lock.current||!valid||!changed)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const data=await request('/admin/points',{method:'POST',body:JSON.stringify({points:parsed,revision})});
   if(active.current){setValues(Object.fromEntries(editable.map(r=>[r.key,String(data.points[r.key])])));setOriginal(data.points);setRevision(data.revision);setNotice('Puntos guardados para todas las ligas.')}
  }catch(e){if(active.current)setError(e.message||'No se pudieron guardar los puntos.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 return <View style={{...panel,gap:12}}>
  <Text style={{...text,color:theme.muted,fontSize:12}}>Puntuaciones por acción · Todas las ligas</Text>
  {editable.map(r=><View key={r.key} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:3}}>
   <Text style={{...text,flex:1,fontWeight:'700'}}>{r.label}</Text>
   <TextInput accessibilityLabel={'Puntos por '+r.label} keyboardType="numbers-and-punctuation" editable={!busy&&!!values} value={values?.[r.key]??''} onChangeText={v=>{setValues(old=>({...old,[r.key]:v}));setNotice('')}} style={{width:72,padding:10,color:theme.text,backgroundColor:theme.header,borderRadius:9,borderWidth:1,borderColor:theme.border,textAlign:'center',fontWeight:'800'}}/>
  </View>)}
  <Text style={{...text,fontSize:12,color:theme.muted}}>Valores enteros de −20 a +20. El capitán sigue multiplicando ×2. El once ideal premia en dinero.</Text>
  <Button onPress={save} disabled={busy||!changed}>{busy?'Guardando…':'Guardar puntuaciones'}</Button>
  <Button secondary disabled={busy} onPress={load}>Restaurar valores actuales</Button>
  <ErrorText>{error}</ErrorText>
  {!!notice&&<Text style={{...text,color:theme.accent}}>{notice}</Text>}
 </View>;
}
