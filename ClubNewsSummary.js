import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import {api} from './api';
import {buildClubSummary} from './club-summary.cjs';

function Totals({title,subtitle,total,loading}){
 const cardValue=value=>total.teamMatches&&!total.cardMatches?'—':String(value);
 return <View style={s.card}>
  <View style={s.header}><Text style={s.title}>{title}</Text><Text style={s.muted}>{subtitle}</Text></View>
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
  {total.stale&&<Text style={s.warning}>Hay equipos pendientes de actualizar.</Text>}
 </View>;
}

export default function ClubNewsSummary({teams}){
 const [details,setDetails]=useState(false);
 const [records,setRecords]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{
  let active=true,cursor=0;const pages=new Map(),controller=new AbortController();
  setLoading(true);setFailed(false);setRecords([]);
  async function load(){
   while(active&&cursor<teams.length){
    const team=teams[cursor++];let offset=0;
    try{
     do{
      const path=`/api/club-stats?team=${encodeURIComponent(team.id)}&offset=${offset}`;
      const apply=data=>{if(!active)return;pages.set(path,data.records||[]);setRecords([...pages.values()].flat());if(data.error||data.offline)setFailed(true)};
      const data=await api(path,{signal:controller.signal,onUpdate:apply});
      if(!active)return;
      if(data.error||data.offline)setFailed(true);
      apply(data);
      offset=data.nextOffset;
     }while(active&&Number.isSafeInteger(offset)&&offset>0);
    }catch{if(active)setFailed(true)}
   }
  }
  Promise.all([load(),load()]).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;controller.abort()};
 },[teams]);
 return <View style={{gap:8}}>
  <View style={s.header}><Text style={s.heading}>Resumen del club</Text><Text style={s.muted}>Todos los equipos · RFFM</Text></View>
  <Totals title="La temporada" subtitle="Acumulado 2026/27" total={buildClubSummary(teams,records)} loading={loading}/>
  {failed&&<Text style={s.warning}>Algunas actas están pendientes de actualizar.</Text>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:details}} onPress={()=>setDetails(value=>!value)} hitSlop={8}><Text style={s.detailLink}>{details?'Ocultar detalle':'Cómo se calcula'} {details?'−':'+'}</Text></Pressable>
  {details&&<Text style={s.muted}>Las actas que faltan no se cuentan como cero. Solo se suman goles y tarjetas de los equipos del club. Una segunda amarilla cuenta como amarilla y expulsión. Los partidos aplazados se incluyen en la semana en que se juegan.</Text>}
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
});
