import React,{useState,useEffect,useRef} from 'react';
import {View,Text,Pressable,StyleSheet,AppState} from 'react-native';
import {api} from './api';
import PlayerPortrait from './PlayerPortrait';
export default function MatchEvents({match,onVenue,onUpdate}){
 const [data,set]=useState(null),[busy,sb]=useState(true),[retry,sr]=useState(0);
 const venue=useRef(onVenue),update=useRef(onUpdate);venue.current=onVenue;update.current=onUpdate;
 useEffect(()=>{set(null)},[match.team.id,match.id]);
 useEffect(()=>{
  let active=true,running=false,controller;
  const refresh=async()=>{
   if(running||['background','inactive'].includes(AppState.currentState))return;
   running=true;sb(true);controller=new AbortController();
   try{
    const value=await api('/api/match?team='+encodeURIComponent(match.team.id)+'&match='+encodeURIComponent(match.id)+'&refresh=1',{signal:controller.signal,cache:'no-store'});
    if(active){set(value);if(!value.error)update.current?.(value);if(value.venue)venue.current?.(value.venue)}
   }catch{if(active)set(previous=>({...previous,error:true}))}
   finally{running=false;if(active)sb(false)}
  };
  void refresh();const timer=setInterval(refresh,60000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh()});
  return()=>{active=false;clearInterval(timer);listener.remove();controller?.abort()};
 },[match.team.id,match.id,retry]);
 return <View style={{gap:12}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
   <Text style={s.muted}>{data?.updatedAt?'Acta consultada: '+new Date(data.updatedAt).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}):'Actualización automática cada minuto'}</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Actualizar acta" disabled={busy} onPress={()=>sr(value=>value+1)}><Text style={s.link}>{busy?'Actualizando…':'Actualizar acta'}</Text></Pressable>
  </View>
  {busy&&!data?<Text style={s.muted}>Consultando goles y tarjetas del acta…</Text>:<>
   {data?.error&&<View style={s.card}><Text style={s.warning}>No se pudo actualizar el acta. {data.goalsAvailable||data.cardsAvailable?'Se muestran los últimos datos disponibles.':'Los goleadores y las tarjetas no están disponibles ahora.'}</Text></View>}
   {data&&!data.error&&!data.closed&&<Text style={s.warning}>Acta pendiente de cierre: los datos pueden estar incompletos.</Text>}
   {[['Goles','goals','goalsAvailable'],['Tarjetas','cards','cardsAvailable']].map(([label,key,available])=><View style={s.card} key={key}>
    <Text style={s.heading}>{label}</Text>
    {!data?.[available]?<Text style={s.muted}>Información no publicada en el acta disponible.</Text>:!data[key].length?<Text style={s.muted}>{key==='goals'?'No hay goles registrados en el acta.':'No hay tarjetas registradas en el acta.'}</Text>:data[key].map((e,i)=><View key={i} style={s.event}><Text style={s.minute}>{e.minute?e.minute+'′':'Minuto no publicado'}</Text><PlayerPortrait name={e.name} teamId={String(e.team||'').toLocaleLowerCase('es').includes('villalbilla')?match.team.id:null} disableLookup={!String(e.team||'').toLocaleLowerCase('es').includes('villalbilla')} size={44}/><View style={{flex:1,gap:5}}><Text style={s.name}>{e.name}</Text><Text style={s.muted}>{e.team}</Text><Text style={[s.type,key==='cards'&&{color:e.color==='red'?'#ff9995':'#f7d66e'}]}>{e.type}</Text></View></View>)}
   </View>)}
  </>}
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'#151f2d',padding:20,borderRadius:18,gap:16,borderWidth:1,borderColor:'#2d3e52'},heading:{fontSize:21,fontWeight:'800',color:'#fff'},muted:{fontSize:13,lineHeight:21,color:'#aab8cb'},warning:{color:'#ffc1c9',lineHeight:21},link:{color:'#91adff',fontWeight:'700',padding:10},event:{flexDirection:'row',gap:12,borderTopWidth:1,borderColor:'#2d3e52',paddingTop:14},minute:{fontSize:14,color:'#91adff',fontWeight:'800',width:62},name:{color:'#fff',fontWeight:'700',lineHeight:21},type:{fontSize:12,color:'#91adff',fontWeight:'700'}});
