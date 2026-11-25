import React,{useRef,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,ErrorText,panel,title,text,theme} from './FantasyUI';

// Only shown inside Club admin settings. The API re-verifies admin rights.
export default function FantasyLeagueReset({request}){
 const [open,setOpen]=useState(false),[leagues,setLeagues]=useState([]),[selected,setSelected]=useState(null);
 const [preview,setPreview]=useState(null),[confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [remove,setRemove]=useState(false);
 const verb=remove?'ELIMINAR':'REINICIAR', action=remove?'delete':'reset';
 const locked=useRef(false);
 async function list(deleting=false){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setNotice('');
  try{const data=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(data.leagues||[]);setPreview(null);setSelected(null);setConfirmation('');setRemove(deleting);setOpen(true)}
  catch(e){setError(e.message||'No se pudieron consultar las ligas.')}
  finally{locked.current=false;setBusy(false)}
 }
 async function choose(league){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');setNotice('');setConfirmation('');setPreview(null);setSelected(league.id);
  try{setPreview(await request('/admin/leagues/'+league.id+'/'+action,{cache:'reload'}))}
  catch(e){setError(e.message||'No se pudo consultar la liga.')}
  finally{locked.current=false;setBusy(false)}
 }
 async function execute(){
  if(locked.current||!preview||confirmation!==verb+' '+preview.name)return;
  locked.current=true;setBusy(true);setError('');
  try{
   const result=await request('/admin/leagues/'+preview.leagueId+'/'+action,{method:'POST',body:JSON.stringify({
    confirmation,expectedCreatedAt:preview.createdAt
   })});
   if(remove?!result.deleted:!result.reset)throw Error('El servidor no confirmó la operación.');
   setNotice(remove?'Liga eliminada definitivamente.':'Liga reiniciada. Se mantienen sus participantes, ajustes y mensajes. Puedes volver a preparar plantillas desde cero.');
   setPreview(null);setSelected(null);setConfirmation('');setOpen(false);
   const data=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(data.leagues||[]);
  }catch(e){setError(e.message||'No se pudo reiniciar la liga. No repitas la acción sin comprobar su estado.')}
  finally{locked.current=false;setBusy(false)}
 }
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Administración de ligas</Text>
  <Text style={text}>Solo administradores. Borra plantillas, compras, subastas, cláusulas y resultados de Fantasy de una liga, sin borrar la liga, sus participantes, sus ajustes, sus mensajes ni las temporadas archivadas.</Text>
  <Button secondary disabled={busy} onPress={()=>list(false)}>Reiniciar liga</Button>
  <Button secondary disabled={busy} onPress={()=>list(true)}>Eliminar liga</Button>
  {open&&<>
   <Text style={{...title,fontSize:18,color:theme.negative}}>{remove?'Selecciona la liga que quieres eliminar':'Selecciona la liga que quieres reiniciar'}</Text>
   <Button secondary disabled={busy} onPress={()=>list(remove)}>Actualizar lista</Button>
   <Button secondary disabled={busy} onPress={()=>{setOpen(false);setPreview(null);setConfirmation('')}}>Cerrar</Button>
   {leagues.map(league=><Button key={league.id} secondary disabled={busy} onPress={()=>choose(league)}>{selected===league.id?'● ':''}{league.name}</Button>)}
   {preview&&<View style={{gap:10,padding:12,borderRadius:10,borderWidth:1,borderColor:theme.negative}}>
    <Text style={{...title,fontSize:18,color:theme.negative}}>{remove?'Eliminar':'Reiniciar'}: {preview.name}</Text>
    <Text style={text}>{remove?'Se eliminará esta liga y sus datos, sin borrar las cuentas de usuario.':`Se conservarán ${preview.membersPreserved} participantes, la liga y los ajustes. Las plantillas y operaciones se reiniciarán.`}</Text>
    <Text style={text}>Acción irreversible desde esta pantalla. Antes de continuar, asegúrate de conservar la copia SQL de Cloudflare.</Text>
    <Text style={text}>Para confirmar escribe exactamente: {verb} {preview.name}</Text>
    <TextInput accessibilityLabel="Confirmación de reinicio de liga" autoCapitalize="none" autoCorrect={false} value={confirmation} editable={!busy} onChangeText={setConfirmation} placeholder={verb+' nombre de la liga'} placeholderTextColor={theme.muted} style={{padding:12,color:theme.text,backgroundColor:theme.header,borderRadius:10,borderWidth:1,borderColor:theme.border}}/>
    <Button disabled={busy||confirmation!==verb+' '+preview.name} onPress={execute}>{busy?'Procesando…':remove?'Confirmar eliminación definitiva':'Confirmar reinicio definitivo de esta liga'}</Button>
    <Button secondary disabled={busy} onPress={()=>{setPreview(null);setSelected(null);setConfirmation('')}}>Cancelar</Button>
   </View>}
  </>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>
}
