import React,{useCallback,useEffect,useState} from 'react';
import {View,Text,Pressable,ActivityIndicator,StyleSheet} from 'react-native';
import {api} from './api';

function Person({item}){return <View style={s.person}><View style={[s.badge,item.teamId===item.currentTeamId&&s.badgeRed]}><Text style={s.badgeText}>{item.number||'—'}</Text></View><View style={{flex:1,gap:3}}><Text style={s.name}>{item.name}</Text><Text style={s.muted}>{item.teamName?`${item.teamName} · `:''}{item.reason||'Sanción pendiente'} · Jornada {item.round}{item.yellowCards?` · ${item.yellowCards} amarillas`:''}{item.minute?` · ${item.minute}’`:''}</Text></View></View>}

export default function Sanctions({teamId,compact=false,rivalOnly=false,teamAlertsOnly=false}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(true),[failed,setFailed]=useState(false);
 const refresh=useCallback(async()=>{setBusy(true);try{const next=await api('/api/sanctions?team='+encodeURIComponent(teamId)+(rivalOnly||teamAlertsOnly?'&scope=team':''),{onUpdate:value=>{setData(value);setFailed(!!value.error)}});setData(next);setFailed(Boolean(next.error))}catch{setFailed(true)}finally{setBusy(false)}},[teamId]);
 useEffect(()=>{refresh();const timer=setInterval(refresh,300000);return()=>clearInterval(timer)},[refresh]);
 const rival=data?.opponentDismissals||[];
 const all=(data?.allSanctions||data?.pending||[]).slice().sort((a,b)=>(a.teamName||'').localeCompare(b.teamName||'')||(a.name||'').localeCompare(b.name||''));
 const teams=[...new Set(all.map(item=>item.teamName||'Equipo'))];
 const pending=data?.pending||[],yellowWarnings=data?.yellowWarnings||[];
 if(teamAlertsOnly&&(!data||(!pending.length&&!yellowWarnings.length)))return null;
 if(teamAlertsOnly)return <View style={[s.card,s.compact,s.alertCard]}>{failed&&<Text style={s.warning}>Avisos guardados: no se pudo actualizar la resolución.</Text>}{pending.map((item,index)=><Text key={'pending-'+index} style={s.alertRed}>🚫 {item.name}{item.number?' · dorsal '+item.number:''}: {item.reason}. Consulta la resolución oficial.</Text>)}{yellowWarnings.map((item,index)=><Text key={'yellow-'+index} style={s.alertYellow}>🟨 {item.name}{item.number?' · dorsal '+item.number:''} · acumulación de {item.yellowCards} amarillas. Revisa el ciclo y la resolución de su competición.</Text>)}</View>;
 return <View style={[s.card,compact&&s.compact,rivalOnly&&s.rivalCard]}>
  {!compact&&<><Text style={s.eyebrow}>COMPETICIÓN · DISCIPLINA</Text><Text style={s.title}>Sanciones de todos los equipos</Text><Text style={s.muted}>Solo se muestran sanciones cuya fuente publica una duración explícita.</Text></>}
  {busy&&!data&&<View style={s.loading}><ActivityIndicator color="#91adff"/><Text style={s.muted}>Consultando las actas…</Text></View>}
  {failed&&<Text style={s.warning}>No se pudieron revisar las actas ahora. Pulsa «Actualizar» para intentarlo de nuevo.</Text>}
  {data&&!failed&&rivalOnly&&<>
   <Text style={s.rivalTitle}>Sanciones del próximo rival</Text>
   {data.opponentDataComplete===false&&<Text style={s.warning}>Faltan actas del rival; puede que no aparezcan todas sus sanciones.</Text>}{rival.length?rival.map((item,index)=><Person key={`rival-${item.name}-${item.number||index}`} item={{...item,currentTeamId:teamId}}/>):data.opponentActAvailable===false?<Text style={s.muted}>El acta más reciente del rival todavía no está disponible.</Text>:<Text style={s.muted}>No constan sanciones del rival con duración explícita en las actas consultadas.</Text>}
  </>}
  {data&&!failed&&!rivalOnly&&<>
   {data.nextMatch&&<Text style={s.muted}>Grupo de tu equipo · Próxima jornada {data.nextMatch.round}</Text>}
   {!data.allTeamsDataComplete&&<Text style={s.warning}>Faltan algunas actas; puede que no aparezcan todas las sanciones calculadas.</Text>}{all.length?teams.map(name=><View key={name}><Text style={s.section}>{name}</Text>{all.filter(item=>(item.teamName||'Equipo')===name).map((item,index)=><Person key={`${item.teamId}-${item.name}-${item.number||index}`} item={{...item,currentTeamId:teamId}}/>)}</View>):<Text style={s.muted}>No constan sanciones con duración explícita en las actas consultadas.</Text>}
   <Text style={s.note}>Las tarjetas sin duración publicada no se convierten en sanciones. Los partidos o fechas restantes son estimaciones; comprueba el inicio y cumplimiento en la resolución oficial antes de convocar.</Text>
  </>}
  {data&&!failed&&rivalOnly&&<Text style={s.note}>Se muestran únicamente duraciones publicadas. La ausencia de datos no confirma que el rival no tenga sanciones.</Text>}
  <Text style={s.disclaimer}>Aviso: esta información es orientativa y puede contener errores. Comprueba siempre las sanciones en la resolución oficial.</Text>
  <Pressable accessibilityRole="button" disabled={busy} onPress={refresh} style={s.refresh}><Text style={s.refreshText}>{busy?'Actualizando…':'Actualizar sanciones'}</Text></Pressable>
 </View>
}

const s=StyleSheet.create({card:{gap:12,padding:16,borderRadius:16,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52'},compact:{marginTop:12},rivalCard:{padding:12,backgroundColor:'#111b29'},alertCard:{marginTop:0,borderColor:'#66523a',backgroundColor:'#201d1a'},alertRed:{color:'#ffc1c9',fontSize:14,fontWeight:'800',lineHeight:21},alertYellow:{color:'#ffe2a6',fontSize:14,fontWeight:'800',lineHeight:21},eyebrow:{color:'#91adff',fontWeight:'800',fontSize:11,letterSpacing:1},title:{color:'#f4f7fb',fontSize:23,fontWeight:'900'},section:{color:'#f4f7fb',fontSize:16,fontWeight:'800',marginTop:10},rivalTitle:{color:'#f4f7fb',fontSize:14,fontWeight:'800'},muted:{color:'#aebbd0',fontSize:13,lineHeight:19},warning:{color:'#ffc1c9',fontWeight:'700',lineHeight:20},disclaimer:{color:"#ffc1c9",fontSize:12,lineHeight:18,fontWeight:"700",marginTop:6},note:{color:'#8293a9',fontSize:12,lineHeight:18,marginTop:6},loading:{flexDirection:'row',alignItems:'center',gap:10},person:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9,borderTopWidth:1,borderColor:'#2d3e52'},badge:{width:40,height:40,borderRadius:12,backgroundColor:'#26374e',alignItems:'center',justifyContent:'center'},badgeRed:{backgroundColor:'#b9252d'},badgeText:{color:'white',fontWeight:'900',fontSize:16},name:{color:'#f4f7fb',fontSize:15,fontWeight:'800'},refresh:{paddingVertical:9,alignSelf:'flex-start'},refreshText:{color:'#91adff',fontWeight:'800',fontSize:14}});
