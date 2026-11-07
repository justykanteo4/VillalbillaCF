import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,StyleSheet,AppState} from 'react-native';
import {api} from './api';
import {buildClubSummary} from './club-summary.cjs';
import {readCopy,saveCopy} from './offline';
import {loadClubCards} from './club-card-loader.cjs';
import {mergeCardRecords,madridToday} from './club-card-records.cjs';
import seed from './club-cards-seed.json';

function Totals({title,subtitle,total,loading}){
 const cardValue=value=>total.teamMatches&&!total.cardMatches?'—':String(value);
 return <View style={s.card}>
  <View style={s.header}><Text style={s.title}>{title}</Text><Text style={s.muted}>{subtitle}</Text></View>
  <View style={s.balance}>
   {[['PG',total.won,'Partidos ganados'],['PE',total.drawn,'Partidos empatados'],['PP',total.lost,'Partidos perdidos']].map(([label,value,description])=><Text key={label} accessibilityLabel={description+': '+value} style={s.balanceValue}>{label} <Text style={{color:'#fff'}}>{value}</Text></Text>)}
  </View>
  <View style={s.metrics}>
   {[
    ['Goles a favor',String(total.goalsFor),'#91adff'],
    ['Goles en contra',String(total.goalsAgainst),'#eaf0fa'],
    ['Amarillas',cardValue(total.yellow),'#f6d46c'],
    ['Rojas',cardValue(total.red),'#ff9995'],
   ].map(([label,value,color])=><View key={label} style={s.metric}><Text style={[s.value,{color}]}>{value}</Text><Text style={s.label}>{label}</Text></View>)}
  </View>
  <Text style={s.muted}>{total.teams} equipos · {total.matches} partidos</Text>
  {!total.teamMatches?<Text style={s.muted}>Sin resultados publicados.</Text>:<Text style={total.cardsComplete?s.muted:s.warning}>
   {total.cardsComplete?'Tarjetas: recuento completo.':`${loading?'Consultando actas':'Tarjetas: recuento parcial'} · ${total.cardMatches}/${total.teamMatches} actas.`}
  </Text>}
  {total.unclosedCards>0&&<Text style={s.warning}>{total.unclosedCards} actas siguen sin cerrar en la fuente; sus tarjetas no están confirmadas.</Text>}
  {total.cardStale&&<Text style={s.warning}>Se conservan tarjetas guardadas; actualización pendiente.</Text>}
  {total.stale&&<Text style={s.warning}>Hay equipos pendientes de actualizar.</Text>}
 </View>;
}

export default function ClubNewsSummary({teams}){
 const [details,setDetails]=useState(false);
 const [records,setRecords]=useState(seed.records),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 const [request,setRequest]=useState(0);
 const signature=JSON.stringify([madridToday(),teams.map(t=>[t.id,t.error,(t.fixtures||[]).map(m=>[m.id,m.date,m.homeId,m.awayId,m.homeScore,m.awayScore])])]);
 useEffect(()=>{
  let active=true,running=false;const controller=new AbortController();
  async function refresh(force=false){if(running||controller.signal.aborted)return;running=true;setLoading(true);setFailed(false);try{const result=await loadClubCards(teams,{readCopy,saveCopy,fetchPage:api,seed:seed.records,signal:controller.signal,force,onRecords:rows=>{if(active)setRecords(old=>mergeCardRecords(old,rows))}});if(active)setFailed(result.failed)}catch{if(active)setFailed(true)}finally{running=false;if(active)setLoading(false)}}
  refresh(request>0);const timer=setInterval(()=>refresh(),300000),subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{active=false;controller.abort();clearInterval(timer);subscription.remove()};
 },[signature,request]);
 return <View style={{gap:8}}>
  <View style={s.header}><Text style={s.heading}>Resumen del club</Text><Text style={s.muted}>Todos los equipos · RFFM</Text></View>
  <Totals title="La temporada" subtitle="Acumulado 2026/27" total={buildClubSummary(teams,records)} loading={loading}/>
  {failed&&<Text style={s.warning}>No se pudo actualizar todo. Se conservan las tarjetas confirmadas que ya estaban guardadas.</Text>}
  <Pressable accessibilityRole="button" disabled={loading} onPress={()=>setRequest(n=>n+1)} hitSlop={8}><Text style={s.detailLink}>{loading?'Comprobando resumen…':'Actualizar resumen'}</Text></Pressable>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:details}} onPress={()=>setDetails(value=>!value)} hitSlop={8}><Text style={s.detailLink}>{details?'Ocultar detalle':'Cómo se calcula'} {details?'−':'+'}</Text></Pressable>
  {details&&<Text style={s.muted}>PG: ganados; PE: empatados; PP: perdidos. Se cuenta el resultado de cada equipo del club; en un cruce entre dos equipos del club se cuenta uno para cada equipo. Los partidos sin resultado publicado no se cuentan. Un resultado publicado puede seguir teniendo el acta pendiente de cierre. Las tarjetas se suman desde actas cerradas guardadas en el dispositivo. Las actas que faltan no se cuentan como cero. Solo se suman goles y tarjetas de los equipos del club. Una segunda amarilla cuenta como amarilla y expulsión.</Text>}
 </View>;
}
const s=StyleSheet.create({
 heading:{fontSize:16,fontWeight:'900',color:'#fff'},title:{fontSize:14,fontWeight:'800',color:'#fff'},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'wrap'},
 card:{padding:11,borderRadius:12,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52',gap:5},
 muted:{fontSize:11,lineHeight:16,color:'#aab8cb'},warning:{fontSize:11,lineHeight:16,color:'#ffc1c9'},
 metrics:{flexDirection:'row',gap:5},metric:{flex:1,minWidth:0,paddingVertical:7,paddingHorizontal:2,borderRadius:8,backgroundColor:'#0b121d',gap:2,alignItems:'center'},
 value:{fontSize:22,lineHeight:26,fontWeight:'900'},label:{fontSize:10,lineHeight:13,color:'#dce6f2',textAlign:'center'},
 detailLink:{fontSize:11,lineHeight:18,color:'#91adff'},
 balance:{flexDirection:'row',justifyContent:'space-around',gap:10,paddingVertical:6},balanceValue:{fontSize:14,fontWeight:'800',color:'#91adff'},
});
