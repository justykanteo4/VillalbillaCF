import React,{useRef,useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';
import {matchesPersonQuery} from './name-search.cjs';

export default function FantasyPlayerBlocks({request}){
 const [leagues,setLeagues]=useState(null),[league,setLeague]=useState(null);
 const [players,setPlayers]=useState([]),[blocked,setBlocked]=useState([]),[query,setQuery]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const pending=useRef(false);
 async function run(fn){
  if(pending.current)return;
  pending.current=true;setBusy(true);setError('');
  try{await fn()}catch(e){setError(e.message||'No se pudo consultar o guardar el bloqueo.')}finally{pending.current=false;setBusy(false)}
 }
 const endpoint=id=>'/admin/leagues/'+encodeURIComponent(id)+'/player-blocks';
 async function load(){await run(async()=>{const result=await request('/admin/leagues/reset',{cache:'reload'});setLeagues(result.leagues||[]);setNotice('')})}
 async function choose(id){await run(async()=>{
  const next=await request(endpoint(id),{cache:'reload'});
  setLeague(next.league);setPlayers(next.players||[]);setBlocked(next.blocked||[]);setQuery('');setNotice('');
 })}
 async function change(player){
  if(!league)return;
  await run(async()=>{
   const old=blocked.some(item=>item.playerId===player.id);
   await request(endpoint(league.id),{method:'POST',body:JSON.stringify({playerId:player.id,blocked:!old,expectedBlocked:old})});
   const updated=await request(endpoint(league.id),{cache:'reload'});
   setBlocked(updated.blocked||[]);
   setNotice(old?'Jugador desbloqueado para nuevos fichajes.':'Nuevos fichajes bloqueados. No se elimina a quienes ya lo tienen.');
  });
 }
 const results=query.trim().length>=2?players.filter(player=>matchesPersonQuery(player.name+' '+player.team,query.trim())).slice(0,25):[];
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Club · Bloquear fichajes de jugadores</Text>
  <Text style={text}>El bloqueo afecta a nuevas pujas, ofertas, compras y cláusulas en esta liga. No elimina jugadores ya fichados ni borra dinero.</Text>
  <Button secondary disabled={busy} onPress={load}>{leagues?'Actualizar ligas':'Elegir una liga'}</Button>
  {leagues?.map(item=><Button key={item.id} secondary disabled={busy} onPress={()=>choose(item.id)}>{league?.id===item.id?'● ':''}{item.name}</Button>)}
  {league&&<View style={{gap:10}}>
   <Text style={{...text,fontWeight:'800'}}>Liga: {league.name} · {blocked.length} bloqueados</Text>
   <TextInput accessibilityLabel="Buscar jugador para bloquear" value={query} onChangeText={setQuery} placeholder="Buscar nombre de jugador o equipo" placeholderTextColor={theme.muted} style={{color:theme.text,padding:12,backgroundColor:theme.header,borderRadius:10,borderColor:theme.border,borderWidth:1}}/>
   {query.trim().length<2&&<Text style={{...text,color:theme.muted}}>Escribe al menos dos letras para buscar.</Text>}
   {query.trim().length>=2&&results.length===0&&<Text style={{...text,color:theme.muted}}>No se encontraron jugadores.</Text>}
   {results.map(player=>{
    const isBlocked=blocked.some(item=>item.playerId===player.id);
    return <View key={player.id} style={{gap:5,padding:9,borderBottomWidth:1,borderColor:theme.border}}>
     <Text style={{...text,fontWeight:'800'}}>{player.name} · {player.team||'Club'}</Text>
     <Button secondary disabled={busy} onPress={()=>change(player)}>{isBlocked?'Desbloquear fichajes':'Bloquear nuevos fichajes'}</Button>
    </View>;
   })}
  </View>}
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
