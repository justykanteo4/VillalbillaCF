import React,{useState,useEffect} from 'react';
import {View,Text,StyleSheet,Linking,Pressable} from 'react-native';
import {api} from './api';

const descriptions={0:'Despejado',1:'Poco nuboso',2:'Parcialmente nuboso',3:'Cubierto',45:'Niebla',48:'Niebla con escarcha',51:'Llovizna ligera',53:'Llovizna',55:'Llovizna intensa',56:'Llovizna helada',57:'Llovizna helada intensa',61:'Lluvia ligera',63:'Lluvia',65:'Lluvia intensa',66:'Lluvia helada',67:'Lluvia helada intensa',71:'Nieve ligera',73:'Nieve',75:'Nieve intensa',77:'Nieve granulada',80:'Chubascos ligeros',81:'Chubascos',82:'Chubascos fuertes',85:'Chubascos de nieve',86:'Chubascos de nieve intensos',95:'Tormenta',96:'Tormenta con granizo',99:'Tormenta con granizo fuerte'};
export function weatherIcon(code){
  if(code===0)return '☀️';
  if(code===1)return '🌤️';
  if(code===2)return '⛅';
  if(code===3)return '☁️';
  if(code===45||code===48)return '🌫️';
  if(code>=51&&code<=67)return '🌧️';
  if(code>=71&&code<=77||code===85||code===86)return '🌨️';
  if(code>=80&&code<=82)return '🌦️';
  if(code>=95)return '⛈️';
  return '🌤️';
}

export default function MatchWeather({fieldId,date,time,compact=false}){
  const [data,set]=useState(null);
  useEffect(()=>{
    let active=true;set(null);if(!fieldId)return;
    async function refresh(){try{const result=await api('/api/weather?field='+fieldId+'&date='+date+'&time='+encodeURIComponent(time||''),{onUpdate:value=>{if(active)set(value)}});if(active)set(result)}catch{if(active)set({available:false,reason:'service'})}}
    refresh();const timer=setInterval(refresh,1800000);
    return()=>{active=false;clearInterval(timer)};
  },[fieldId,date,time]);
  const number=(value,suffix)=>value==null?'No disponible':Math.round(value)+suffix;
  const icon=data?.available?weatherIcon(data.code):'🌤️';
  const condition=data?.available?(descriptions[data.code]||'Previsión disponible'):!data?'Consultando previsión…':data.reason==='range'?'Previsión aún no disponible':data.reason==='location'?'Ubicación pendiente':'Previsión no disponible';

  if(compact){
    const brief=data?.available?condition:!fieldId?'Tiempo pendiente':!data?'Consultando…':data.reason==='range'?'Previsión próximamente':'Tiempo pendiente';
    const temperature=data?.available?(data.mode==='hourly'?number(data.temperature,'°'):number(data.min,'°')+' / '+number(data.max,'°')):null;
    return <View style={s.compact} accessibilityLabel={'Tiempo: '+brief}>
      <Text style={s.compactIcon}>{icon}</Text>
      <Text style={s.compactCondition}>{brief}</Text>
      {!!temperature&&<Text style={s.compactTemperature}>{temperature}</Text>}
    </View>;
  }

  return <View style={s.panel}>
    <Text style={s.title}>EL TIEMPO EN EL CAMPO</Text>
    <View style={s.conditionRow} accessibilityLabel={'Previsión: '+condition}>
      <Text style={s.weatherIcon}>{icon}</Text>
      <Text style={s.condition}>{condition}</Text>
    </View>
    {!fieldId?<Text style={s.muted}>Pendiente de confirmar la localización del campo.</Text>:!data?<Text style={s.muted}>Consultando la previsión del día del partido…</Text>:!data.available?<Text style={s.muted}>{data.reason==='range'?'La previsión para esta fecha todavía no está disponible. Se mostrará cuando se acerque el partido.':data.reason==='location'?'No hay coordenadas confirmadas del campo para consultar el tiempo.':'No se ha podido obtener la previsión. Vuelve a consultar más tarde.'}</Text>:<>
      <Text style={s.muted}>{date.split('-').reverse().join('/')} · {data.mode==='hourly'?'Sobre las '+data.time+' h (hora de Madrid)':'Previsión del día; hora del partido por confirmar'}</Text>
      <View style={s.row}>
        <View style={s.metric}><Text style={s.value}>{data.mode==='hourly'?number(data.temperature,' °C'):number(data.min,'°')+' / '+number(data.max,'°')}</Text><Text style={s.muted}>{data.mode==='hourly'?'Temperatura':'Mínima / máxima'}</Text></View>
        <View style={s.metric}><Text style={s.value}>{number(data.rain,' %')}</Text><Text style={s.muted}>Probabilidad de lluvia</Text></View>
        {data.mode==='hourly'&&<View style={s.metric}><Text style={s.value}>{number(data.wind,' km/h')}</Text><Text style={s.muted}>Viento</Text></View>}
      </View>
      {data.error&&<Text style={s.muted}>No se ha podido actualizar; previsión anterior guardada.</Text>}
      <Text style={s.muted}>Previsión orientativa, puede cambiar antes del partido.</Text>
    </>}
    <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://open-meteo.com/').catch(()=>{})}><Text style={s.source}>Datos meteorológicos: Open-Meteo ↗</Text></Pressable>
  </View>;
}

const s=StyleSheet.create({panel:{paddingTop:16,borderTopWidth:1,borderColor:'#2d3e52',gap:12},title:{color:'#91adff',fontSize:11,fontWeight:'800',letterSpacing:1},conditionRow:{flexDirection:'row',alignItems:'center',gap:12},weatherIcon:{fontSize:34},condition:{fontSize:19,color:'#fff',fontWeight:'800',flex:1},muted:{color:'#aab8cb',fontSize:12,lineHeight:20},row:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{padding:12,backgroundColor:'#1b2e4b',borderRadius:12,flexGrow:1,flexBasis:'40%',gap:6},value:{color:'#fff',fontSize:20,fontWeight:'800'},source:{color:'#91adff',fontSize:11,paddingVertical:6},compact:{flexDirection:'row',alignItems:'center',gap:7,alignSelf:'flex-start',paddingVertical:5,paddingHorizontal:9,borderRadius:10,backgroundColor:'#0d1726',maxWidth:'100%'},compactIcon:{fontSize:17},compactCondition:{fontSize:11,color:'#b8c7da',fontWeight:'600',flexShrink:1},compactTemperature:{fontSize:11,color:'#91adff',fontWeight:'800'}});
