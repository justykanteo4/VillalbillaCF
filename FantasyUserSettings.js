import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {Button,ErrorText,Field,panel,text,title,theme} from './FantasyUI';

export default function FantasyUserSettings({request}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[page,setPage]=useState(null);
 const [selected,select]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=useRef(true),locked=useRef(false),search=useRef('');
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[]);
 async function load(value,after=''){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');
  if(!after){search.current=value.trim();setPage(null);select(null);setNotice('')}
  try{
   const suffix='?q='+encodeURIComponent(search.current)+'&after='+encodeURIComponent(after);
   const next=await request('/admin/users'+suffix,{cache:'reload'});
   if(active.current)setPage(previous=>({...next,users:after?[...(previous?.users||[]),...next.users]:next.users}));
  }catch(e){if(active.current)setError(e.message)}
  finally{locked.current=false;if(active.current)setBusy(false)}
 }
 async function change(user,excluded){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setNotice('');
  try{
   await request('/admin/users',{method:'POST',body:JSON.stringify({uid:user.uid,excluded})});
   if(active.current){
    setPage(previous=>({...previous,users:previous.users.map(row=>row.uid===user.uid?{...row,excludedAt:excluded?Date.now():null}:row)}));
    select(null);setNotice(excluded?'Acceso a Fantasy retirado.':'Acceso a Fantasy restaurado.');
   }
  }catch(e){if(active.current)setError(e.message)}
  finally{locked.current=false;if(active.current)setBusy(false)}
 }
 return <View style={panel}>
  <Text accessibilityRole="header" style={title}>Gestión de accesos a Fantasy</Text>
  {!open?<Button secondary onPress={()=>{setOpen(true);load('')}}>Gestionar y recuperar accesos</Button>:<>
   <Field label="Buscar por nombre o ID" value={query} onChange={setQuery}/>
   <Button secondary disabled={busy} onPress={()=>load(query)}>Buscar usuarios</Button>
   <Button secondary disabled={busy} onPress={()=>{setQuery('');load('')}}>Mostrar todos los usuarios</Button>
   <Text style={text}>Los usuarios bloqueados sin liga también aparecen. Si no tienen nombre guardado, se identifican por su ID.</Text>
   <ErrorText>{error}</ErrorText>
   {!!notice&&<Text accessibilityRole="alert" style={text}>{notice}</Text>}
   {busy&&<Text style={text}>Consultando Fantasy…</Text>}
   {!!page&&!page.users.length&&<Text style={text}>No se encontraron usuarios.</Text>}
   {page?.users.map(user=><View key={user.uid} style={{gap:6,borderTopWidth:1,borderColor:theme.border,paddingTop:10}}>
    <Text style={{...text,fontWeight:'800'}}>{user.nickname}</Text>
    <Text style={{...text,color:theme.muted}}>{user.excludedAt!=null?'Acceso desactivado':'Acceso activo'} · {user.uid} · {user.leagues} {user.leagues===1?'liga':'ligas'}</Text>
    {user.excludedAt!=null?<Button secondary disabled={busy} onPress={()=>change(user,false)}>Restaurar acceso</Button>:
     selected===user.uid?<>
      <Text style={text}>Se retirará su acceso a todas las ligas de Fantasy. Se conservarán su cuenta y su historial.</Text>
      <Button disabled={busy} onPress={()=>change(user,true)}>Confirmar retirada de acceso</Button>
      <Button secondary disabled={busy} onPress={()=>select(null)}>Cancelar</Button>
     </>:<Button secondary disabled={busy} onPress={()=>select(user.uid)}>Quitar de Fantasy</Button>}
   </View>)}
   {!!page?.next&&<Button secondary disabled={busy} onPress={()=>load(search.current,page.next)}>Ver más usuarios</Button>}
  </>}
 </View>;
}
