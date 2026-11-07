import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth,onAuthStateChanged} from './firebase';
import React,{useCallback,useEffect,useState,useRef} from 'react';
import {View,Text,Pressable,ActivityIndicator,StyleSheet,Linking} from 'react-native';
import {api} from './api';

function Person({item}){return <View style={s.person}><View style={[s.badge,item.teamId===item.currentTeamId&&s.badgeRed]}><Text style={s.badgeText}>{item.number||'—'}</Text></View><View style={{flex:1,gap:3}}><Text style={s.name}>{item.name}</Text><Text style={s.muted}>{item.teamName?`${item.teamName} · `:''}{item.role==='staff'?'Cuerpo técnico · ':''}{item.reason||'Sanción pendiente'} · Jornada {item.round}{item.yellowCards?` · ${item.yellowCards} amarillas`:''}{item.minute?` · ${item.minute}’`:''}</Text></View></View>}

export default function Sanctions({teamId,compact=false,rivalOnly=false,teamAlertsOnly=false}){
 const [user,setUser]=useState(auth?.currentUser),[data,setData]=useState(null),[busy,setBusy]=useState(true),[failed,setFailed]=useState(false),generation=useRef(0);
 useEffect(()=>auth?onAuthStateChanged(auth,setUser):undefined,[]);
 const refresh=useCallback(async(force=false)=>{const turn=++generation.current;if(!user){setFailed(true);setBusy(false);return}setBusy(true);const key='villalbilla.private-sanctions.v1.'+user.uid+'.'+teamId+'.'+(rivalOnly||teamAlertsOnly?'team':'all');try{if(!force){const raw=await AsyncStorage.getItem(key);if(raw&&turn===generation.current)setData(JSON.parse(raw))}const token=await user.getIdToken(),next=await api('/api/private/sanctions?team='+encodeURIComponent(teamId)+(rivalOnly||teamAlertsOnly?'&scope=team':'')+(force?'&refresh=1':''),{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(turn!==generation.current||auth.currentUser?.uid!==user.uid)return;setData(current=>next.sourceAvailable===false&&current?{...current,error:true,sourceStatus:next.sourceStatus}:next);setFailed(Boolean(next.error));if(next.sourceAvailable)await AsyncStorage.setItem(key,JSON.stringify(next))}catch(e){if(turn===generation.current){if(e.status===401||e.status===403)setData(null);setFailed(true)}}finally{if(turn===generation.current)setBusy(false)}},[teamId,user?.uid,rivalOnly,teamAlertsOnly]);
 useEffect(()=>{generation.current++;setData(null);setFailed(false)},[teamId,user?.uid,rivalOnly,teamAlertsOnly]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),300000);return()=>{generation.current++;clearInterval(timer)}},[refresh]);
 const rival=data?.opponentDismissals||[];
 const all=(data?.allSanctions||data?.pending||[]).slice().sort((a,b)=>Number(b.teamId===teamId)-Number(a.teamId===teamId)||(a.teamName||'').localeCompare(b.teamName||'')||(a.name||'').localeCompare(b.name||''));
 const teams=[...new Set(all.map(item=>item.teamName||'Equipo'))];
 const pending=data?.pending||[],yellowWarnings=data?.yellowWarnings||[];
 if(teamAlertsOnly&&(!data||(!pending.length&&!yellowWarnings.length)))return null;
 if(teamAlertsOnly)return <View style={[s.card,s.compact,s.alertCard]}>{failed&&<Text style={s.warning}>Avisos guardados: no se pudo actualizar la resolución.</Text>}{pending.map((item,index)=><Text key={'pending-'+index} style={s.alertRed}>🚫 {item.name}{item.number?' · dorsal '+item.number:''}: {item.reason}. Consulta la resolución oficial.</Text>)}{yellowWarnings.map((item,index)=><Text key={'yellow-'+index} style={s.alertYellow}>🟨 {item.name}{item.number?' · dorsal '+item.number:''} · acumulación de {item.yellowCards} amarillas. Revisa el ciclo y la resolución de su competición.</Text>)}</View>;
 return <View style={[s.card,compact&&s.compact,rivalOnly&&s.rivalCard]}>
  <Text style={s.muted}>Resoluciones oficiales de la federación para la competición de tu equipo. Se guardan por cuenta en este dispositivo para consultarlas sin conexión.</Text>
  {data?.updatedAt&&<Text style={s.muted}>Última actualización: {new Date(data.updatedAt).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</Text>}
  {!compact&&<><Text style={s.eyebrow}>COMPETICIÓN · DISCIPLINA</Text><Text style={s.title}>Sanciones de todos los equipos</Text><Text style={s.muted}>Se muestran las suspensiones publicadas en la resolución, incluidas las de acumulación y doble amonestación.</Text></>}
  {busy&&!data&&<View style={s.loading}><ActivityIndicator color="#91adff"/><Text style={s.muted}>Consultando las resoluciones…</Text></View>}
  {failed&&<Text style={s.warning}>No se pudo actualizar la resolución oficial. Se conserva la última copia disponible; vuelve a intentarlo más tarde.</Text>}
  {data?.sourceAvailable===false&&<Text style={s.warning}>La consulta oficial todavía no está disponible. Esto no significa que no haya sancionados.</Text>}
  {data&&data.sourceAvailable!==false&&rivalOnly&&<>
   <Text style={s.rivalTitle}>Sanciones del próximo rival</Text>
   {data.opponentDataComplete===false&&<Text style={s.warning}>La comprobación del rival está incompleta; revisa la resolución oficial.</Text>}{rival.length?rival.map((item,index)=><Person key={`rival-${item.name}-${item.number||index}`} item={{...item,currentTeamId:teamId}}/>):data.opponentActAvailable===false?<Text style={s.muted}>La resolución más reciente del rival todavía no está disponible.</Text>:<Text style={s.muted}>No constan suspensiones del rival en las resoluciones descargadas.</Text>}
  </>}
  {data&&data.sourceAvailable!==false&&!rivalOnly&&<>
   {data.nextMatch&&<Text style={s.muted}>Grupo de tu equipo · Próxima jornada {data.nextMatch.round}</Text>}
   {!data.allTeamsDataComplete&&<Text style={s.warning}>No se pudo completar la comprobación de la fuente o de los partidos cumplidos. Revisa la resolución oficial.</Text>}{all.length?teams.map(name=><View key={name}><Text style={s.section}>{name}</Text>{all.filter(item=>(item.teamName||'Equipo')===name).map((item,index)=><Person key={`${item.teamId}-${item.name}-${item.number||index}`} item={{...item,currentTeamId:teamId}}/>)}</View>):<Text style={s.muted}>No constan suspensiones pendientes en las resoluciones descargadas.</Text>}
   <Text style={s.note}>Fuente: resolución oficial de la federación. Las tarjetas sin resolución no se convierten en sanciones. Los partidos o fechas restantes son estimaciones; comprueba el inicio y cumplimiento en la resolución oficial antes de convocar.</Text>
  </>}
  {data&&rivalOnly&&<Text style={s.note}>Fuente: resolución oficial. La ausencia de datos no confirma que el rival no tenga sanciones.</Text>}
  <Text style={s.disclaimer}>Aviso: esta información es orientativa y puede contener errores. Comprueba siempre las sanciones en la resolución oficial.</Text>
  <Pressable accessibilityRole="button" onPress={()=>Linking.openURL('https://intranet.ffmadrid.es/nfg/NPcd/NFG_ConsultaSanciones?cod_primaria=1000191').catch(()=>{})}><Text style={s.refreshText}>Consultar resolución oficial ↗</Text></Pressable>
  <Pressable accessibilityRole="button" disabled={busy} onPress={()=>refresh(true)} style={s.refresh}><Text style={s.refreshText}>{busy?'Actualizando…':'Actualizar sanciones'}</Text></Pressable>
 </View>
}

const s=StyleSheet.create({card:{gap:12,padding:16,borderRadius:16,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52'},compact:{marginTop:12},rivalCard:{padding:12,backgroundColor:'#111b29'},alertCard:{marginTop:0,borderColor:'#66523a',backgroundColor:'#201d1a'},alertRed:{color:'#ffc1c9',fontSize:14,fontWeight:'800',lineHeight:21},alertYellow:{color:'#ffe2a6',fontSize:14,fontWeight:'800',lineHeight:21},eyebrow:{color:'#91adff',fontWeight:'800',fontSize:11,letterSpacing:1},title:{color:'#f4f7fb',fontSize:23,fontWeight:'900'},section:{color:'#f4f7fb',fontSize:16,fontWeight:'800',marginTop:10},rivalTitle:{color:'#f4f7fb',fontSize:14,fontWeight:'800'},muted:{color:'#aebbd0',fontSize:13,lineHeight:19},warning:{color:'#ffc1c9',fontWeight:'700',lineHeight:20},disclaimer:{color:"#ffc1c9",fontSize:12,lineHeight:18,fontWeight:"700",marginTop:6},note:{color:'#8293a9',fontSize:12,lineHeight:18,marginTop:6},loading:{flexDirection:'row',alignItems:'center',gap:10},person:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:9,borderTopWidth:1,borderColor:'#2d3e52'},badge:{width:40,height:40,borderRadius:12,backgroundColor:'#26374e',alignItems:'center',justifyContent:'center'},badgeRed:{backgroundColor:'#b9252d'},badgeText:{color:'white',fontWeight:'900',fontSize:16},name:{color:'#f4f7fb',fontSize:15,fontWeight:'800'},refresh:{paddingVertical:9,alignSelf:'flex-start'},refreshText:{color:'#91adff',fontWeight:'800',fontSize:14}});
