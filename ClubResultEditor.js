import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';
import teams from './teams.json';
import TeamSelector from './TeamSelector';
import {auth} from './firebase';
import {api} from './api';
import {visibleClubTeamIds,canEditClubTeam} from './club-role-policy.cjs';
import {editableFixtures,validScore,scoreDraft} from './club-result-editor-ui.cjs';

const colors={text:'#eff4fa',muted:'#aab8cb',accent:'#91adff',panel:'#151f2d',header:'#1b2e69',error:'#ffc1c9'};
const title={color:colors.text,fontSize:19,fontWeight:'800'},label={color:colors.muted,fontSize:12},card={padding:14,borderRadius:13,backgroundColor:colors.panel,gap:12};
function Action({children,onPress,disabled=false,danger=false}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding:13,borderRadius:10,backgroundColor:danger?'#40202b':colors.header,opacity:disabled?0.5:1}}>
  <Text style={{color:danger?colors.error:colors.text,fontWeight:'700',textAlign:'center'}}>{children}</Text>
 </Pressable>;
}
async function editRequest(teamId,matchId,body){
 const user=auth?.currentUser;
 if(!user)throw Error('Inicia sesión para corregir resultados.');
 const token=await user.getIdToken();
 if(auth?.currentUser?.uid!==user.uid)throw Error('La cuenta ha cambiado. Vuelve a entrar.');
 const params='?team='+encodeURIComponent(teamId)+'&match='+encodeURIComponent(matchId);
 return api('/api/admin/result-edits'+params,{
  ...(body?{method:'POST',body:JSON.stringify({teamId,matchId,...body})}:{}),
  headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  cache:'no-store'
 });
}

export default function ClubResultEditor({account}){
 const allowedIds=visibleClubTeamIds(account,teams.map(t=>t.id));
 const selectable=teams.filter(t=>allowedIds.includes(String(t.id))&&canEditClubTeam(account,t.id,{capability:'results'}));
 const [teamId,setTeamId]=useState(selectable[0]?.id||null),[fixtures,setFixtures]=useState([]),[match,setMatch]=useState(null);
 const [home,setHome]=useState(''),[away,setAway]=useState(''),[revision,setRevision]=useState(null);
 const [history,setHistory]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const seq=useRef(0),saving=useRef(false);
 useEffect(()=>{const id=++seq.current;setFixtures([]);setMatch(null);setRevision(null);setHistory([]);setError('');setNotice('');
  if(!teamId||!selectable.some(t=>t.id===teamId))return;
  setBusy(true);
  api('/api/team-calendar?team='+encodeURIComponent(teamId),{cache:'reload'}).then(value=>{
   if(id===seq.current)setFixtures(editableFixtures(value?.fixtures));
  }).catch(e=>{if(id===seq.current)setError(e.message||'No se pudieron cargar los partidos.')})
   .finally(()=>{if(id===seq.current)setBusy(false)});
  return()=>{seq.current++};
 },[teamId,account?.id,account?.status]);
 async function openMatch(fixture){
  const id=++seq.current;setMatch(fixture);setRevision(null);setHistory([]);setError('');setNotice('');
  setHome(scoreDraft(fixture.homeScore));setAway(scoreDraft(fixture.awayScore));
  setBusy(true);
  try{
   const value=await editRequest(teamId,String(fixture.id));
   if(id!==seq.current)return;
   setRevision(value.revision);setHistory(value.history||[]);
   if(value.edit){setHome(scoreDraft(value.edit.homeScore));setAway(scoreDraft(value.edit.awayScore))}
  }catch(e){if(id===seq.current)setError(e.message||'No se pudo comprobar el historial.')}
  finally{if(id===seq.current)setBusy(false)}
 }
 async function save(restore=false){
  if(saving.current||!match||revision===null||!canEditClubTeam(account,teamId,{capability:'results'}))return;
  if(!restore&&(!validScore(home)||!validScore(away))){setError('Introduce un marcador entre 0 y 99.');return}
  saving.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await editRequest(teamId,String(match.id),restore?{restore:true,revision}:{homeScore:Number(home),awayScore:Number(away),revision});
   setRevision(result.revision);setHistory(result.history||[]);
   setMatch(result.fixture);
   setHome(scoreDraft(result.fixture.homeScore));setAway(scoreDraft(result.fixture.awayScore));
   setFixtures(rows=>rows.map(row=>String(row.id)===String(match.id)?result.fixture:row));
   setNotice(restore?'Restaurado el resultado oficial.':'Resultado corregido. El cambio queda registrado en el historial.');
  }catch(e){setError(e.message||'No se ha podido guardar el resultado. Actualiza e inténtalo de nuevo.')}
  finally{saving.current=false;setBusy(false)}
 }
 if(!selectable.length)return <Text style={label}>No tienes equipos autorizados para corregir resultados.</Text>;
 const matchName=m=>[m.homeName||m.homeTeam||'Local',m.awayName||m.awayTeam||'Visitante'].join(' - ');
 return <View style={{gap:14}}>
  <Text accessibilityRole="header" style={{...title,fontSize:23}}>Corregir resultados</Text>
  <Text style={label}>Solo tus equipos autorizados. Los cambios se guardan con tu nombre y fecha.</Text>
  <TeamSelector value={teamId} onChange={setTeamId} options={selectable} label="Equipo"/>
  {busy&&!match&&<Text style={label}>Cargando partidos…</Text>}
  {!match?<View style={{gap:8}}>
   {fixtures.length===0&&!busy&&<Text style={label}>No hay partidos disponibles.</Text>}
   {fixtures.slice(0,40).map(fixture=><Pressable key={String(fixture.id)} accessibilityRole="button" onPress={()=>openMatch(fixture)} style={card}>
    <Text style={{color:colors.text,fontWeight:'700'}}>{matchName(fixture)}</Text>
    <Text style={label}>{fixture.date||'Sin fecha'} · Jornada {fixture.round||'—'} · {fixture.homeScore??'—'} - {fixture.awayScore??'—'}</Text>
   </Pressable>)}
  </View>:<View style={card}>
   <Action onPress={()=>{seq.current++;setMatch(null);setRevision(null);setError('');setNotice('')}} disabled={busy}>‹ Volver a partidos</Action>
   <Text style={title}>{matchName(match)}</Text>
   <Text style={label}>{match.date||'Sin fecha'} · Jornada {match.round||'—'}</Text>
   <View style={{flexDirection:'row',gap:12}}>
    {[['Goles local',home,setHome],['Goles visitante',away,setAway]].map(([text,value,setValue])=><View key={text} style={{flex:1,gap:7}}>
     <Text style={label}>{text}</Text>
     <TextInput accessibilityLabel={text} value={value} onChangeText={setValue} editable={!busy} keyboardType="number-pad" maxLength={2} style={{padding:13,borderRadius:9,backgroundColor:'#0b121d',color:colors.text,fontSize:20,textAlign:'center'}}/>
    </View>)}
   </View>
   <Action disabled={busy||revision===null||!validScore(home)||!validScore(away)} onPress={()=>save(false)}>{busy?'Comprobando…':'Guardar corrección'}</Action>
   {account?.status==='admin'&&history.length>0&&<Action danger disabled={busy||revision===null} onPress={()=>save(true)}>Restaurar resultado oficial</Action>}
   {history.length>0&&<><Text style={{color:colors.text,fontWeight:'700'}}>Historial de correcciones</Text>{history.slice(0,6).map(row=><Text key={row.id} style={label}>{row.actor_name||'Usuario'} · {new Date(row.created_at).toLocaleString('es-ES')} · {row.previous_home??'—'}-{row.previous_away??'—'} → {row.home_score??'Oficial'}-{row.away_score??'Oficial'}</Text>)}</>}
  </View>}
  {!!error&&<Text accessibilityRole="alert" style={{color:colors.error}}>{error}</Text>}
  {!!notice&&<Text accessibilityRole="alert" style={{color:'#8ce2a8'}}>{notice}</Text>}
 </View>;
}
