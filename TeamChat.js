import React,{useContext,useEffect,useRef,useState} from 'react';
import {AppState,Text,TextInput,View,Pressable} from 'react-native';
import {randomUUID} from 'expo-crypto';
import {auth} from './firebase';
import teams from './teams.json';
import {chatUrl} from './social-client';
import {SocialSession,SocialGate,s,socialAllowed} from './SocialCommunity';
const merge=(old,next)=>[...new Map([...old,...next].map(row=>[row.id,row])).values()].sort((a,b)=>a.seq-b.seq);
function Button({children,onPress,disabled}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,disabled&&{opacity:.45}]}><Text style={s.action}>{children}</Text></Pressable>}
export default function TeamChat({initialTeamId}){
 const {account}=useContext(SocialSession),[selected,setSelected]=useState(initialTeamId||account?.claim?.teamId||teams[0].id),[picker,setPicker]=useState(false);
 if(!socialAllowed(account))return <SocialGate/>;
 const teamId=account.status==='admin'?selected:account.claim?.teamId;
 return <View style={{gap:14}}><Text style={s.title}>Chat de equipo</Text>{account.status==='admin'&&<><Button onPress={()=>setPicker(!picker)}>Equipo: {teams.find(team=>team.id===teamId)?.category} ▾</Button>{picker&&teams.map(team=><Button key={team.id} onPress={()=>{setSelected(team.id);setPicker(false)}}>{team.category} · {team.name}</Button>)}</>}<ChatRoom key={account.id+':'+teamId} teamId={teamId}/></View>
}
function ChatRoom({teamId}){
 const {account}=useContext(SocialSession),[messages,setMessages]=useState([]),[next,setNext]=useState(null),[draft,setDraft]=useState(''),[status,setStatus]=useState('Conectando…'),[ready,setReady]=useState(false),[moderator,setModerator]=useState(false),[error,setError]=useState(''),[reports,setReports]=useState(null),[pending,setPending]=useState(null),[retry,setRetry]=useState(0),[confirm,setConfirm]=useState(null);
 const socket=useRef(null),retryMessage=useRef(null),pendingRef=useRef(null),timer=useRef(null);
 useEffect(()=>{
  let active=true,stopped=false,attempts=0,reconnectTimer=null,renewTimer=null;
  const clear=()=>{clearTimeout(reconnectTimer);clearInterval(renewTimer);socket.current?.close(1000,'Chat cerrado');socket.current=null;setReady(false)};
  const ack=rows=>{if(pendingRef.current&&rows.some(row=>row.id===pendingRef.current)){pendingRef.current=null;clearTimeout(timer.current);setPending(null);setDraft('');retryMessage.current=null}};
  const connect=()=>{
   if(!active||stopped||AppState.currentState==='background'||(typeof document!=='undefined'&&document.hidden))return;
   clear();setStatus('Conectando…');setError('');let ws;
   try{ws=new WebSocket(chatUrl(teamId));socket.current=ws}catch(e){setError(e.message);setStatus('Sin conexión');return}
   const authenticate=async()=>{try{const token=await auth.currentUser?.getIdToken();if(active&&socket.current===ws&&ws.readyState===1)ws.send(JSON.stringify({type:'auth',token}))}catch{if(active){setError('No se pudo renovar tu sesión.');ws.close()}}};
   ws.onopen=()=>{authenticate();renewTimer=setInterval(authenticate,240000)};
   ws.onmessage=event=>{
    if(!active||socket.current!==ws)return;
    let data;try{data=JSON.parse(event.data)}catch{return}
    if(data.type==='ready'){attempts=0;setReady(true);setStatus('Conectado · Solo tu equipo');setModerator(data.moderator);setMessages(current=>merge(current,data.messages));setNext(data.next);ack(data.messages)}
    if(data.type==='history'){setMessages(current=>merge(current,data.messages));setNext(data.next)}
    if(data.type==='message'){setMessages(current=>merge(current,[data.message]));ack([data.message])}
    if(data.type==='deleted')setMessages(current=>current.map(row=>row.id===data.id?{...row,deleted:1,body:''}:row));
    if(data.type==='reported')setError('Denuncia enviada al cuerpo técnico.');
    if(data.type==='reports')setReports(data.reports);
    if(data.type==='resolved'){setReports(null);setError('Denuncia revisada.');}
    if(data.type==='error'){setError(data.error);if(data.status===401||data.status===403){stopped=true;setReady(false)}if(data.requestId===pendingRef.current){clearTimeout(timer.current);setPending(null);pendingRef.current=null}}
   };
   ws.onerror=()=>{if(active&&socket.current===ws)setError('No se pudo conectar al chat. Puedes volver a intentarlo.');};
   ws.onclose=()=>{
    if(!active||socket.current!==ws)return;
    clearInterval(renewTimer);setReady(false);setStatus('Desconectado');
    if(pendingRef.current){setPending(null);pendingRef.current=null;clearTimeout(timer.current);setError('No se pudo confirmar el envío. Conservamos el texto; reintenta al conectar.');}
    if(!stopped&&attempts<5){reconnectTimer=setTimeout(connect,Math.min(30000,2000*2**attempts++));}
   };
  };
  connect();const sub=AppState.addEventListener('change',state=>{if(state==='active'){attempts=0;connect()}else clear()});
  const visibility=()=>{if(document.hidden)clear();else connect()};
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clear();clearTimeout(timer.current);sub.remove();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility)};
 },[teamId,retry]);
 function send(value){if(!ready||socket.current?.readyState!==1){setError('Espera a que se conecte el chat.');return false}socket.current.send(JSON.stringify(value));return true}
 function submit(){
  if(pending||!draft.trim())return;
  const body=draft.trim(),id=retryMessage.current?.body===body?retryMessage.current.id:randomUUID();retryMessage.current={id,body};
  if(send({type:'message',id,body})){pendingRef.current=id;setPending(id);setError('');timer.current=setTimeout(()=>{setPending(null);pendingRef.current=null;setError('No se confirmó el envío. Puedes reintentarlo sin duplicar el mensaje.');},15000)}
 }
 return <View style={{gap:13}}><View style={s.hero}><Text style={s.heading}>{teams.find(team=>team.id===teamId)?.name||'Mi equipo'}</Text><Text accessibilityLiveRegion="polite" style={s.muted}>{status}</Text><Text style={s.muted}>Mensajes de texto privados para jugadores y cuerpo técnico aprobados. Historial de los últimos 90 días.</Text>{!ready&&<Button onPress={()=>setRetry(n=>n+1)}>Volver a conectar</Button>}</View>{!!error&&<Text accessibilityLiveRegion="polite" style={s.notice}>{error}</Text>}{next&&<Button disabled={!ready} onPress={()=>send({type:'history',before:next})}>Cargar mensajes anteriores</Button>}{!messages.length&&ready&&<Text style={s.muted}>Todavía no hay mensajes. ¡Saluda a tu equipo!</Text>}{messages.map(row=>{const mine=row.uid===(account.id||account.uid);return <View key={row.id} style={[s.card,{marginLeft:mine?24:0,marginRight:mine?0:24,borderColor:mine?'#5788a6':'#2d3e52'}]}><Text style={s.name}>{mine?'Tú':row.name}</Text><Text style={s.copy}>{row.deleted?'Mensaje eliminado':row.body}</Text><Text style={s.date}>{new Date(row.created_at).toLocaleString('es-ES')}</Text>{!row.deleted&&<View style={s.row}>{(mine||moderator)&&<Button disabled={!ready} onPress={()=>setConfirm(confirm===row.id?null:row.id)}>{confirm===row.id?'Cancelar':'Eliminar'}</Button>}{confirm===row.id&&<Button disabled={!ready} onPress={()=>{send({type:'delete',id:row.id});setConfirm(null)}}>Confirmar eliminación</Button>}{!mine&&<Button disabled={!ready} onPress={()=>send({type:'report',id:row.id,reason:'Solicito revisar este mensaje.'})}>Denunciar</Button>}</View>}</View>})}<View style={s.card}><TextInput accessibilityLabel="Mensaje para tu equipo" value={draft} onChangeText={setDraft} editable={!pending} maxLength={2000} multiline placeholder="Escribe a tu equipo…" placeholderTextColor="#91a5be" style={s.input}/><Button disabled={!ready||!!pending||!draft.trim()} onPress={submit}>{pending?'Enviando…':'Enviar mensaje'}</Button><Text style={s.muted}>Hasta 100 acciones por persona y 1.000 por equipo al día.</Text></View>{moderator&&<><Button disabled={!ready} onPress={()=>reports?setReports(null):send({type:'reports'})}>{reports?'Cerrar denuncias':'Revisar denuncias del equipo'}</Button>{reports?.length===0&&<Text style={s.muted}>No hay denuncias pendientes.</Text>}{reports?.map((row,index)=><View key={row.message_id+':'+index} style={s.card}><Text style={s.name}>{row.name}</Text><Text style={s.copy}>{row.body||'Mensaje eliminado'}</Text><Text style={s.muted}>{row.reason}</Text><View style={s.row}><Button disabled={!ready} onPress={()=>{send({type:'delete',id:row.message_id});setReports(null)}}>Eliminar mensaje</Button><Button disabled={!ready} onPress={()=>send({type:'resolve',id:row.message_id})}>Descartar denuncia</Button></View></View>)}</>}</View>
}
