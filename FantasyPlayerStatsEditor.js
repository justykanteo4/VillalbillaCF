import {DividerView} from './AppDividers';
import appTheme from './app-theme';
import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView} from 'react-native';
import {Button,ErrorText,text,panel,title,theme} from './FantasyUI';
const keys=[['goals','Goles'],['assists','Asistencias'],['yellow','Amarillas'],['red','Rojas'],['ownGoals','Goles en propia'],['secondYellow','Segunda amarilla']];
const label={...text,color:theme.muted,fontSize:12};
export default function FantasyPlayerStatsEditor({request}){
 const [matches,setMatches]=useState([]),[selected,setSelected]=useState(null),[data,setData]=useState(null);
 const [player,setPlayer]=useState(null),[draft,setDraft]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function loadMatches(){setBusy(true);setError('');try{const response=await request('/admin/player-stats',{cache:'reload'});setMatches(response.matches||[])}catch(e){setError(e.message||'No se pudieron consultar los partidos.')}finally{setBusy(false)}}
 useEffect(()=>{loadMatches()},[]);
 async function openMatch(match){setSelected(match);setPlayer(null);setData(null);setError('');setNotice('');setBusy(true);
  try{setData(await request('/admin/player-stats?team='+encodeURIComponent(match.teamId)+'&match='+encodeURIComponent(match.matchId),{cache:'reload'}))}
  catch(e){setError(e.message||'No se pudo cargar el acta.')}finally{setBusy(false)}}
 function choose(p){setPlayer(p);setDraft(Object.fromEntries(keys.map(([k])=>[k,String(p.stats[k]??0)])));setNotice('');setError('')}
 async function save(){if(!selected||!player||busy)return;
  const values=Object.fromEntries(keys.map(([k])=>[k,Number(draft[k])]));
  if(keys.some(([k])=>!/^(?:0|[1-9]\d?)$/.test(draft[k]||'')||values[k]>20)||values.secondYellow>1||values.secondYellow>values.red){setError('Introduce valores enteros entre 0 y 20. Segunda amarilla debe ser 0 o 1 y requiere una tarjeta roja.');return}
  setBusy(true);setError('');setNotice('');
  try{
   await request('/admin/player-stats',{method:'POST',body:JSON.stringify({teamId:selected.teamId,matchId:selected.matchId,playerId:player.id,revision:player.revision,stats:values})});
   const fresh=await request('/admin/player-stats?team='+encodeURIComponent(selected.teamId)+'&match='+encodeURIComponent(selected.matchId),{cache:'reload'});
   setData(fresh);const updated=fresh.match?.players.find(p=>p.id===player.id);if(updated)choose(updated);setNotice('Estadísticas Fantasy guardadas y registradas. El acta oficial no se modifica.');
  }catch(e){setError(e.message||'No se pudo guardar.');if(e.status===409){try{const recent=await request('/admin/player-stats?team='+encodeURIComponent(selected.teamId)+'&match='+encodeURIComponent(selected.matchId),{cache:'reload'});setData(recent);const latest=recent.match?.players.find(p=>p.id===player.id);if(latest){setPlayer(latest);setDraft(Object.fromEntries(keys.map(([k])=>[k,String(latest.stats[k]??0)])));setError('Otro administrador ha modificado estas estadísticas. Se han cargado los últimos datos; revísalos antes de guardar.')}}catch{setPlayer(null);setError('Las estadísticas cambiaron en otro dispositivo. Vuelve a abrir el partido.')}}}
  finally{setBusy(false)}
 }
 return <DividerView style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:19}}>Corregir estadísticas Fantasy</Text>
  <Text style={label}>Solo Club. Goles, asistencias y tarjetas por jugador. Los puntos Fantasy se recalculan a partir de estas correcciones, sin modificar el acta oficial.</Text>
  {!selected?<><Button secondary disabled={busy} onPress={loadMatches}>Actualizar partidos</Button><ScrollView style={{maxHeight:300}}>{matches.map(m=><Pressable key={m.teamId+':'+m.matchId} accessibilityRole="button" onPress={()=>openMatch(m)} style={{padding:10,borderBottomWidth:appTheme.lineWidth,borderColor:theme.border}}><Text style={text}>Equipo {m.teamId} · Jornada {m.round||'—'} · Partido {m.matchId}</Text><Text style={label}>{m.players} jugadores en acta</Text></Pressable>)}</ScrollView>{!matches.length&&!busy&&<Text style={label}>No hay actas cerradas disponibles.</Text>}</>:
  <><Button secondary disabled={busy} onPress={()=>{setSelected(null);setData(null);setPlayer(null);setError('');setNotice('')}}>‹ Volver a partidos</Button>
   <Text style={text}>Jornada {selected.round||'—'} · Partido {selected.matchId}</Text>
   {!player?<ScrollView style={{maxHeight:330}}>{(data?.match?.players||[]).map(p=><Pressable key={p.id} accessibilityRole="button" onPress={()=>choose(p)} style={{padding:11,borderBottomWidth:appTheme.lineWidth,borderColor:theme.border}}><Text style={text}>{p.name||'Jugador '+p.id}</Text><Text style={label}>{p.stats.goals} goles · {p.stats.assists} asistencias · {p.stats.yellow} amarillas · {p.stats.red} rojas</Text></Pressable>)}</ScrollView>:
   <><Button secondary onPress={()=>{setPlayer(null);setError('');setNotice('')}}>‹ Elegir otro jugador</Button><Text style={{...title,fontSize:17}}>{player.name||player.id}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{keys.map(([k,name])=><View key={k} style={{minWidth:100,flexGrow:1,gap:5}}><Text style={label}>{name}</Text><TextInput accessibilityLabel={name} value={draft[k]||''} editable={!busy} keyboardType="number-pad" maxLength={2} onChangeText={v=>setDraft(d=>({...d,[k]:v}))} style={{color:theme.text,backgroundColor:theme.header,padding:12,borderRadius:9,borderWidth:1,borderColor:theme.border}}/></View>)}</View>
    <Button disabled={busy} onPress={save}>{busy?'Guardando…':'Guardar estadísticas'}</Button>
   </>}
   {data?.history?.length>0&&<Text style={label}>Últimas modificaciones: {data.history.length} · Historial conservado en el servidor.</Text>}
  </>}
  {!!notice&&<Text style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </DividerView>;
}
