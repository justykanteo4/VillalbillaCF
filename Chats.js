import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable,StyleSheet,AppState,ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {syncChatMembership,watchChatMembers,openDirectChat,watchChatMessages,sendChatMessage} from './chat-client';
import {chatTeams,messageText,mergeChatMessages} from './chat-core.cjs';
import {matchesPersonQuery} from './name-search.cjs';
import {useBackAction} from './useBackNavigation';
import teams from './teams.json';
import TeamSelector from './TeamSelector';

function Conversation({account,teamId,peer,onClose}){
 const [rows,setRows]=useState([]),[text,setText]=useState(''),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const scroll=useRef(null),state=useRef(null),key='villalbilla.chat.v1.'+account.id+'.'+teamId+'.'+(peer?.id||'group');
 useEffect(()=>{
  let alive=true,stop=()=>{},timer,sub,writing=false,saving=Promise.resolve();
  const local={rows:[],outbox:[],directId:null,allowed:true};state.current=local;
  const render=()=>{if(alive)setRows(local.rows)};
  const save=()=>{const raw=JSON.stringify({rows:local.rows,outbox:local.outbox});saving=saving.catch(()=>{}).then(()=>AsyncStorage.setItem(key,raw));return saving};
  const deny=()=>{local.allowed=false;local.rows=[];local.outbox=[];render();saving=saving.catch(()=>{}).then(()=>AsyncStorage.removeItem(key));setReady(false);setError('Tu cuenta ya no tiene acceso a esta conversación.')};
  const flush=async()=>{
   if(!alive||writing||!local.allowed)return;
   writing=true;
   try{if(!local.connected)await connect();while(alive&&local.outbox.length){const row=local.outbox[0];await sendChatMessage(teamId,local.directId,row.body,account,row.id);local.outbox=local.outbox.filter(r=>r.id!==row.id);local.rows=local.rows.map(r=>r.id===row.id?{...r,pending:false}:r);await save();render()}if(alive&&local.allowed)setError('')}
   catch(e){if(!alive)return;if(e.code==='permission-denied')deny();else setError('Sin conexión. Los mensajes pendientes se guardan y se enviarán al recuperar la conexión.')}
   finally{writing=false}
  };
  async function connect(){
   stop();
   if(peer)local.directId=await openDirectChat(teamId,peer.id);
   if(!alive)return;
   stop=watchChatMessages(teamId,local.directId,data=>{if(!alive||!local.allowed)return;local.rows=mergeChatMessages(local.rows,data);const confirmed=new Set(data.filter(r=>!r.pending).map(r=>r.id));local.outbox=local.outbox.filter(r=>!confirmed.has(r.id));render();save().catch(()=>{});flush()},e=>{if(!alive)return;if(e.code==='permission-denied')deny();else {local.connected=false;setError('Sin conexión. Se muestran los mensajes guardados.')}});
   local.connected=true;
  }
  local.send=async body=>{
   if(!local.allowed)throw Error('No tienes acceso.');
   const row={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),body,senderId:account.id,senderName:account.claim.name,createdAt:Date.now(),pending:true};
   local.outbox.push(row);local.rows=mergeChatMessages(local.rows,[row]);
   try{await save()}catch(e){local.outbox=local.outbox.filter(r=>r.id!==row.id);local.rows=local.rows.filter(r=>r.id!==row.id);throw e}
   render();flush();
  };
  (async()=>{
   try{const stored=JSON.parse(await AsyncStorage.getItem(key)||'null');if(alive&&stored){local.rows=stored.rows||[];local.outbox=stored.outbox||[];render()}}
   catch{}
   if(!alive)return;
   setReady(true);
   flush();
   timer=setInterval(flush,15000);sub=AppState.addEventListener('change',v=>{if(v==='active')flush()});
  })();
  return()=>{alive=false;stop();clearInterval(timer);sub?.remove();state.current=null};
 },[key,account.claim.name]);
 async function send(){try{const body=messageText(text);await state.current.send(body);setText('')}catch(e){setError(e.message||'No se pudo guardar el mensaje.')}}
 return <View style={{gap:12}}><Pressable accessibilityRole="button" onPress={onClose}><Text style={s.link}>‹ Volver a chats</Text></Pressable><Text style={s.title}>{peer?.name||'Grupo del equipo'}</Text><Text style={s.muted}>Mensajes de texto · Se conservan hasta 500 mensajes consultados en este dispositivo.</Text>{error&&<Text style={s.error}>{error}</Text>}{!rows.length&&<Text style={s.muted}>Todavía no hay mensajes.</Text>}<ScrollView ref={scroll} style={{maxHeight:420}} contentContainerStyle={{gap:10}} onContentSizeChange={()=>scroll.current?.scrollToEnd({animated:true})}>{rows.map(row=><View key={row.id} style={[s.message,row.senderId===account.id&&s.mine]}><Text style={s.name}>{row.senderName}</Text><Text selectable style={s.body}>{row.body}</Text><Text style={s.muted}>{row.createdAt?new Date(row.createdAt).toLocaleString('es-ES'):''}{row.pending?' · Pendiente de envío':''}</Text></View>)}</ScrollView><TextInput accessibilityLabel="Escribir mensaje" placeholder="Escribe un mensaje" placeholderTextColor="#aab8cb" value={text} onChangeText={setText} maxLength={2000} multiline style={s.input}/><Pressable accessibilityRole="button" disabled={!ready||!text.trim()} onPress={send} style={[s.button,(!ready||!text.trim())&&{opacity:0.5}]}><Text style={s.name}>Enviar</Text></Pressable></View>;
}
export default function Chats({account,initialTeamId}){
 const allowed=chatTeams(account),[chosen,setChosen]=useState(initialTeamId||allowed[0]),teamId=allowed.includes(chosen)?chosen:allowed[0];
 const [members,setMembers]=useState([]),[query,setQuery]=useState(''),[conversation,setConversation]=useState(null),[error,setError]=useState('');
 useBackAction(()=>{setConversation(null);return true},30,!!conversation);
 useEffect(()=>{setConversation(null);setMembers([]);setError('');if(!teamId)return;let active=true,stop=()=>{};
 syncChatMembership(account,teamId).then(()=>{if(active)stop=watchChatMembers(teamId,rows=>{if(active)setMembers(rows.filter(r=>r.id!==account.id))},()=>{if(active)setError('No se pudo consultar la lista. Comprueba la conexión y tus permisos.')})}).catch(()=>{if(active)setError('No se pudo conectar al chat. Comprueba la conexión y tu acceso al equipo.')});return()=>{active=false;stop()};
 },[teamId,account.id]);
 if(!teamId)return <Text style={s.error}>Los chats necesitan un acceso aprobado y un equipo asignado.</Text>;
 return <View style={{gap:16}}><Text style={s.title}>Chats</Text>{allowed.length>1&&<TeamSelector label="Equipo del chat" value={teamId} onChange={setChosen} options={teams.filter(t=>allowed.includes(t.id))}/>}<Text style={s.muted}>{teams.find(t=>t.id===teamId)?.category}</Text>{conversation?<Conversation key={teamId+':'+(conversation.peer?.id||'group')} account={account} teamId={teamId} peer={conversation.peer} onClose={()=>setConversation(null)}/>:<>{error&&<Text style={s.error}>{error}</Text>}<Pressable accessibilityRole="button" style={s.button} onPress={()=>setConversation({})}><Text style={s.name}>💬 Grupo del equipo</Text><Text style={s.muted}>Jugadores y entrenadores asignados</Text></Pressable><Text style={s.title}>Conversaciones privadas</Text><TextInput accessibilityLabel="Buscar persona para chatear" placeholder="Buscar jugador o entrenador" placeholderTextColor="#aab8cb" value={query} onChangeText={setQuery} style={s.input}/>{members.filter(m=>matchesPersonQuery(m.name,query)).map(m=><Pressable key={m.id} accessibilityRole="button" style={s.message} onPress={()=>setConversation({peer:m})}><Text style={s.name}>{m.name}</Text><Text style={s.muted}>{m.role==='player'?'Jugador':'Entrenador'} · Abrir chat privado</Text></Pressable>)}{!members.length&&<Text style={s.muted}>Las personas aparecen cuando abren la app actualizada con su acceso aprobado.</Text>}</>}</View>;
}
const s=StyleSheet.create({title:{color:'#fff',fontSize:23,fontWeight:'800'},name:{color:'#fff',fontWeight:'700'},muted:{color:'#aab8cb',fontSize:11,lineHeight:18},body:{color:'#fff',fontSize:16,lineHeight:24},link:{color:'#91adff',fontWeight:'700',paddingVertical:10},error:{color:'#ffc1c9',lineHeight:21},input:{color:'#fff',padding:14,borderWidth:1,borderColor:'#3a4c63',borderRadius:12,minHeight:52},button:{padding:16,borderRadius:14,backgroundColor:'#1b2e69',gap:6},message:{padding:13,borderRadius:13,backgroundColor:'#151f2d',gap:7},mine:{backgroundColor:'#1b2e69'}});
