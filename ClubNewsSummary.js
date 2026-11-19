import React,{useEffect,useState} from 'react';
import {View,Text,StyleSheet,AppState} from 'react-native';
import {api} from './api';
import {buildClubSummary} from './club-summary.cjs';
import {readCopy,saveCopy} from './offline';
import {loadClubCards} from './club-card-loader.cjs';
import {mergeCardRecords,madridToday} from './club-card-records.cjs';
import seed from './club-cards-seed.json';

function Totals({title,subtitle,total}){
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
 </View>;
}

export default function ClubNewsSummary({teams}){
 const [records,setRecords]=useState(seed.records);
 const signature=JSON.stringify([madridToday(),teams.map(t=>[t.id,t.error,(t.fixtures||[]).map(m=>[m.id,m.date,m.homeId,m.awayId,m.homeScore,m.awayScore])])]);
 useEffect(()=>{
  let active=true,running=false;const controller=new AbortController();
  async function refresh(force=false){if(running||controller.signal.aborted)return;running=true;try{await loadClubCards(teams,{readCopy,saveCopy,fetchPage:api,seed:seed.records,signal:controller.signal,force,onRecords:rows=>{if(active)setRecords(old=>mergeCardRecords(old,rows))}})}catch{/* Mantener las estadísticas guardadas */}finally{running=false}}
  refresh(false);const timer=setInterval(()=>refresh(),300000),subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{active=false;controller.abort();clearInterval(timer);subscription.remove()};
 },[signature]);
 return <View style={{gap:8}}>
  <View style={s.header}><Text style={s.heading}>Resumen del club</Text><Text style={s.muted}>Todos los equipos · RFFM</Text></View>
  <Totals title="La temporada" subtitle="Acumulado 2026/27" total={buildClubSummary(teams,records)}/>
 </View>;
}
const s=StyleSheet.create({
 heading:{fontSize:16,fontWeight:'900',color:'#fff'},title:{fontSize:14,fontWeight:'800',color:'#fff'},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'wrap'},
 card:{padding:11,borderRadius:12,backgroundColor:'#173d75',borderWidth:1,borderColor:'#4b9bda',gap:5},
 muted:{fontSize:11,lineHeight:16,color:'#aab8cb'},
 metrics:{flexDirection:'row',gap:5},metric:{flex:1,minWidth:0,paddingVertical:7,paddingHorizontal:2,borderRadius:8,backgroundColor:'#225496',gap:2,alignItems:'center'},
 value:{fontSize:22,lineHeight:26,fontWeight:'900'},label:{fontSize:10,lineHeight:13,color:'#dce6f2',textAlign:'center'},
 balance:{flexDirection:'row',justifyContent:'space-around',gap:10,paddingVertical:6},balanceValue:{fontSize:14,fontWeight:'800',color:'#91adff'},
});
