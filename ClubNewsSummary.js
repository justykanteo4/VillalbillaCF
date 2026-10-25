import React,{useEffect,useState} from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {api} from './api';
import {buildClubSummary} from './club-summary.cjs';

function Totals({title,subtitle,total,loading}){
 const cardValue=value=>total.teamMatches&&!total.cardMatches?'—':String(value);
 return <View style={s.card}>
  <Text style={s.title}>{title}</Text><Text style={s.muted}>{subtitle}</Text>
  <View style={s.metrics}>
   {[
    ['Goles a favor',String(total.goalsFor),'#91adff'],
    ['Goles en contra',String(total.goalsAgainst),'#eaf0fa'],
    ['Amarillas',cardValue(total.yellow),'#f6d46c'],
    ['Rojas',cardValue(total.red),'#ff9995'],
   ].map(([label,value,color])=><View key={label} style={s.metric}><Text style={[s.value,{color}]}>{value}</Text><Text style={s.label}>{label}</Text></View>)}
  </View>
  <Text style={s.muted}>{total.teams} equipos · {total.matches} partidos con resultado publicado</Text>
  {!total.teamMatches?<Text style={s.muted}>Todavía no hay resultados publicados para este periodo.</Text>:<Text style={total.cardsComplete?s.muted:s.warning}>
   {total.cardsComplete?'Tarjetas de todas las actas disponibles.':`${loading?'Consultando actas':'Tarjetas: recuento parcial'} · ${total.cardMatches} de ${total.teamMatches} registros de equipos consultados. Las actas que faltan no se cuentan como cero.`}
  </Text>}
  {total.stale&&<Text style={s.warning}>Hay equipos pendientes de actualizar. Se muestran sus últimos resultados disponibles.</Text>}
 </View>;
}

export default function ClubNewsSummary({teams,range}){
 const [records,setRecords]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{
  let active=true,cursor=0;const collected=[],controller=new AbortController();
  setLoading(true);setFailed(false);setRecords([]);
  async function load(){
   while(active&&cursor<teams.length){
    const team=teams[cursor++];let offset=0;
    try{
     do{
      const data=await api(`/api/club-stats?team=${encodeURIComponent(team.id)}&offset=${offset}`,{signal:controller.signal});
      if(!active)return;
      if(data.error||data.offline)setFailed(true);
      collected.push(...(data.records||[]));setRecords([...collected]);
      offset=data.nextOffset;
     }while(active&&Number.isSafeInteger(offset)&&offset>0);
    }catch{if(active)setFailed(true)}
   }
  }
  Promise.all([load(),load()]).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false;controller.abort()};
 },[teams]);
 return <View style={{gap:14}}>
  <Text style={s.heading}>Resumen del club</Text>
  <Text style={s.muted}>Todos los equipos de Villalbilla C.F. · Fuente: RFFM</Text>
  <Totals title="La jornada" subtitle={range.label} total={buildClubSummary(teams,records,range)} loading={loading}/>
  <Totals title="La temporada" subtitle="Acumulado 2026/27" total={buildClubSummary(teams,records)} loading={loading}/>
  {failed&&<Text style={s.warning}>No se han podido actualizar todas las actas. Conservamos los datos disponibles y volveremos a intentarlo en la próxima actualización.</Text>}
  <Text style={s.muted}>Solo se suman goles y tarjetas de los equipos del club. Una segunda amarilla cuenta como amarilla y expulsión. Los partidos aplazados se incluyen en la semana en que se juegan.</Text>
 </View>;
}
const s=StyleSheet.create({
 heading:{fontSize:22,fontWeight:'900',color:'#fff'},title:{fontSize:18,fontWeight:'800',color:'#fff'},
 card:{padding:20,borderRadius:20,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52',gap:12},
 muted:{fontSize:13,lineHeight:20,color:'#aab8cb'},warning:{fontSize:13,lineHeight:20,color:'#ffc1c9'},
 metrics:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{flexGrow:1,flexBasis:110,padding:13,borderRadius:12,backgroundColor:'#0b121d',gap:4},
 value:{fontSize:30,fontWeight:'900'},label:{fontSize:13,color:'#dce6f2'},
});
