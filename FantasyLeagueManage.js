import {DividerView} from './AppDividers';
import appTheme from './app-theme';
import React,{useRef,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';

// Only administrators can open this UI; the server independently verifies the role.
export default function FantasyLeagueManage({request}){
 const [list,setList]=useState(null),[current,setCurrent]=useState(null),[history,setHistory]=useState(null),[inscriptions,setInscriptions]=useState(null),[visibility,setVisibility]=useState(null),[lineupLock,setLineupLock]=useState(null);
 const [name,setName]=useState(''),[limit,setLimit]=useState(''),[lifecycle,setLifecycle]=useState(null),[archiveConfirm,setArchiveConfirm]=useState('');
 const [copyOpen,setCopyOpen]=useState(false),[copyName,setCopyName]=useState(''),[copyNickname,setCopyNickname]=useState('');
 const requestId=useRef(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const lock=useRef(false);
 async function run(task){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');
  try{await task()}catch(e){setError(e.message||'No se pudieron modificar los ajustes de la liga.')}finally{lock.current=false;setBusy(false)}
 }
 async function load(){await run(async()=>{const result=await request('/admin/leagues/reset',{cache:'reload'});setList(result.leagues||[]);setNotice('')})}
 async function choose(id){await run(async()=>{
  const [result,enrollment,appearance,lineup,lifecycleState]=await Promise.all([
   request('/admin/leagues/'+encodeURIComponent(id)+'/settings',{cache:'reload'}),
   request('/admin/leagues/'+encodeURIComponent(id)+'/inscriptions',{cache:'reload'}),
   request('/admin/leagues/'+encodeURIComponent(id)+'/visibility',{cache:'reload'}),
   request('/admin/leagues/'+encodeURIComponent(id)+'/lineup-lock',{cache:'reload'}),
   request('/admin/leagues/'+encodeURIComponent(id)+'/lifecycle',{cache:'reload'})
  ]);
  setInscriptions(enrollment);setVisibility(appearance);setLineupLock(lineup);setLifecycle(lifecycleState);setArchiveConfirm('');setCurrent(result);setName(result.name);setLimit(String(result.maxMembers));setNotice('');setHistory(null);setCopyOpen(false);setCopyName(result.name+' - copia');setCopyNickname('Club');requestId.current=null;
 })}
 async function save(){if(!current||lock.current)return;await run(async()=>{
  const next=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/settings',{
   method:'POST',body:JSON.stringify({name:name.trim(),maxMembers:Number(limit),expectedName:current.name,expectedMaxMembers:current.maxMembers})
  });
  setCurrent(next);setName(next.name);setLimit(String(next.maxMembers));
  setNotice('Nombre y límite guardados. Las plantillas y los saldos no se han modificado.');setHistory(null);
  const result=await request('/admin/leagues/reset',{cache:'reload'});setList(result.leagues||[]);
 })}
 async function changeLifecycle(next){
  if(!current||!lifecycle||lock.current)return;
  if(next==='archived'&&archiveConfirm!=='ARCHIVAR '+current.name){setError('Escribe la confirmación exacta para archivar.');return}
  await run(async()=>{
   const result=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/lifecycle',{
    method:'POST',body:JSON.stringify({state:next,revision:lifecycle.revision,confirmation:next==='archived'?archiveConfirm:undefined})
   });
   setLifecycle(result);setArchiveConfirm('');
   setNotice(next==='active'?'Liga reactivada.':next==='paused'?'Liga pausada. Los miembros pueden consultar sus datos, pero no realizar operaciones nuevas.':'Liga archivada: se conservan sus datos y queda de solo lectura.');
  });
 }
 async function changeLineupLock(locked){
  if(!current||!lineupLock||lock.current)return;
  await run(async()=>{
   const result=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/lineup-lock',{
    method:'POST',body:JSON.stringify({locked,expectedLocked:lineupLock.locked})
   });
   setLineupLock(result);setNotice(locked?'Alineaciones bloqueadas. Se mantienen las ya guardadas.':'Alineaciones desbloqueadas hasta su plazo habitual.');
  });
 }
 async function changeVisibility(isPublic){
  if(!current||!visibility||lock.current)return;
  await run(async()=>{
   const result=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/visibility',{
    method:'POST',body:JSON.stringify({public:isPublic,expectedPublic:visibility.public})
   });
   setVisibility(result);
   setNotice(isPublic?'Liga pública: los compañeros autorizados de este equipo podrán encontrarla.':'Liga privada: solo se podrá entrar mediante invitación.');
  });
 }
 async function changeInscriptions(open){
  if(!current||!inscriptions||lock.current)return;
  await run(async()=>{
   const changed=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/inscriptions',{
    method:'POST',body:JSON.stringify({open,expectedOpen:inscriptions.open})
   });
   setInscriptions(changed);
   setNotice(open?'Inscripciones abiertas: nuevos participantes pueden entrar.':'Inscripciones cerradas: los participantes actuales conservan su acceso.');
  });
 }
 async function duplicate(){
  if(!current||lock.current||copyName.trim().length<3||copyName.trim().length>60||copyNickname.trim().length<2||copyNickname.trim().length>32)return;
  if(!requestId.current)requestId.current='copy-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
  await run(async()=>{
   const created=await request('/admin/leagues/'+encodeURIComponent(current.id)+'/duplicate',{method:'POST',body:JSON.stringify({name:copyName.trim(),nickname:copyNickname.trim(),requestId:requestId.current})});
   setNotice('Liga nueva creada: '+created.name+'. Se copiaron las reglas, no los jugadores ni saldos.');
   setCopyOpen(false);requestId.current=null;
   const result=await request('/admin/leagues/reset',{cache:'reload'});setList(result.leagues||[]);
  });
 }
 async function loadHistory(){
  if(!current)return;
  await run(async()=>{const result=await request('/admin/leagues/history?league='+encodeURIComponent(current.id),{cache:'reload'});setHistory(result.events||[])});
 }
 const valid=!!current&&name.trim().length>=3&&name.trim().length<=60&&Number.isInteger(Number(limit))&&Number(limit)>=Math.max(2,current.memberCount)&&Number(limit)<=15&&(current.mode!=='classic'||Number(limit)===current.maxMembers)&&(name.trim()!==current.name||Number(limit)!==current.maxMembers);
 return <DividerView style={{...panel,gap:12}}>
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
   {lifecycle&&<View style={{gap:9,padding:11,borderRadius:10,borderWidth:1,borderColor:theme.border}}>
    <Text style={{...text,fontWeight:'800'}}>Estado de la liga · {lifecycle.state==='active'?'Activa':lifecycle.state==='paused'?'Pausada':'Archivada'}</Text>
    <Text style={{...text,color:theme.muted}}>Pausar impide operaciones nuevas, conservando participantes y datos. Archivar deja la liga solo para consulta; no equivale a eliminarla.</Text>
    {lifecycle.state==='active'&&<Button secondary disabled={busy} onPress={()=>changeLifecycle('paused')}>Pausar liga</Button>}
    {lifecycle.state!=='active'&&<Button secondary disabled={busy} onPress={()=>changeLifecycle('active')}>Reactivar liga</Button>}
    {lifecycle.state!=='archived'&&<>
     <Text style={{...text,color:theme.muted}}>Para archivar escribe exactamente: ARCHIVAR {current.name}</Text>
     <TextInput accessibilityLabel="Confirmar archivo de liga" value={archiveConfirm} onChangeText={setArchiveConfirm} editable={!busy} placeholder="ARCHIVAR nombre de la liga" placeholderTextColor={theme.muted} style={{color:theme.text,padding:12,borderWidth:1,borderRadius:8,borderColor:theme.border}}/>
     <Button secondary disabled={busy||archiveConfirm!=='ARCHIVAR '+current.name} onPress={()=>changeLifecycle('archived')}>Archivar liga sin borrar datos</Button>
    </>}
   </View>}
   {lineupLock&&<View style={{gap:8,padding:10,borderRadius:10,borderWidth:1,borderColor:theme.border}}>
    <Text style={{...text,fontWeight:'800'}}>Alineaciones · {lineupLock.locked?'Bloqueadas':'Permitidas'}</Text>
    <Text style={{...text,color:theme.muted}}>El bloqueo impide cambiar el once en esta liga. No borra alineaciones guardadas ni amplía los plazos normales.</Text>
    <Button secondary disabled={busy} onPress={()=>changeLineupLock(!lineupLock.locked)}>{lineupLock.locked?'Desbloquear alineaciones':'Bloquear alineaciones'}</Button>
   </View>}
   {visibility?.editable&&<View style={{gap:8,padding:10,borderRadius:10,borderWidth:1,borderColor:theme.border}}>
    <Text style={{...text,fontWeight:'800'}}>Privacidad · {visibility.public?'Pública para compañeros':'Privada por invitación'}</Text>
    <Text style={{...text,color:theme.muted}}>Pública: únicamente visible a los compañeros verificados del equipo. Privada: no aparece entre las ligas disponibles y se requiere un código.</Text>
    <Button secondary disabled={busy} onPress={()=>changeVisibility(!visibility.public)}>{visibility.public?'Hacer liga privada':'Hacer liga pública'}</Button>
   </View>}
   {inscriptions&&<View style={{gap:8,padding:10,borderRadius:10,borderWidth:1,borderColor:theme.border}}>
    <Text style={{...text,fontWeight:'800'}}>Inscripciones · {inscriptions.open?'Abiertas':'Cerradas'}</Text>
    <Text style={{...text,color:theme.muted}}>Cerrar impide que entren nuevos participantes, incluso con código de invitación. Los miembros actuales siguen jugando.</Text>
    <Button secondary disabled={busy} onPress={()=>changeInscriptions(!inscriptions.open)}>{inscriptions.open?'Cerrar inscripciones':'Abrir inscripciones'}</Button>
   </View>}
   <Button secondary disabled={busy} onPress={loadHistory}>Ver historial de cambios</Button>
   <Button secondary disabled={busy} onPress={()=>setCopyOpen(old=>!old)}>{copyOpen?'Cancelar duplicación':'Duplicar configuración en otra liga'}</Button>
   {copyOpen&&<View style={{gap:9,padding:12,borderRadius:9,borderWidth:1,borderColor:theme.border}}>
    <Text style={text}>Se creará una liga nueva con las mismas reglas, sin copiar fichajes, jugadores, dinero ni participantes anteriores.</Text>
    <Text style={text}>Nombre de la nueva liga</Text>
    <TextInput accessibilityLabel="Nombre de la liga duplicada" value={copyName} maxLength={60} editable={!busy} onChangeText={setCopyName} style={{color:theme.text,padding:10,borderWidth:1,borderRadius:8,borderColor:theme.border}}/>
    <Text style={text}>Tu nombre en la nueva liga</Text>
    <TextInput accessibilityLabel="Participante creador de la liga duplicada" value={copyNickname} maxLength={32} editable={!busy} onChangeText={setCopyNickname} style={{color:theme.text,padding:10,borderWidth:1,borderRadius:8,borderColor:theme.border}}/>
    <Button disabled={busy||copyName.trim().length<3||copyNickname.trim().length<2} onPress={duplicate}>Crear liga copiando únicamente las reglas</Button>
   </View>}
   {history?.length===0&&<Text style={{...text,color:theme.muted}}>Todavía no hay cambios registrados en esta liga.</Text>}
   {history?.map((event,index)=><DividerView key={index} style={{gap:3,borderTopWidth:appTheme.lineWidth,borderColor:theme.border,paddingTop:8}}>
    <Text style={text}>{new Date(event.createdAt).toLocaleString('es-ES')} · {event.actor}</Text>
    {event.kind==='lifecycle'?<Text style={{...text,color:theme.muted}}>Estado: {event.before.state} → {event.after.state}</Text>:<>
     <Text style={{...text,color:theme.muted}}>{event.before.name} → {event.after.name}</Text>
     <Text style={{...text,color:theme.muted}}>Plazas: {event.before.maxMembers} → {event.after.maxMembers}</Text>
    </>}
   </DividerView>)}
  </View>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </DividerView>;
}
