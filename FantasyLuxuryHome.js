import React,{useEffect,useRef} from 'react';
import {Animated,Image,Pressable,Text,View,useWindowDimensions} from 'react-native';
import theme from './fantasy-theme.cjs';
import FantasyIcon from './FantasyIcon';

const gold='#f1cc7a',blue='#0b3564',red='#6c1436';
const frame={borderRadius:24,borderWidth:1.5,borderColor:gold,overflow:'hidden',backgroundColor:'#092647'};
function Glint({style}){
 const fade=useRef(new Animated.Value(.45)).current;
 useEffect(()=>{const animation=Animated.loop(Animated.sequence([
  Animated.timing(fade,{toValue:1,duration:1600,useNativeDriver:true}),
  Animated.timing(fade,{toValue:.35,duration:1900,useNativeDriver:true})
 ]));animation.start();return()=>animation.stop()},[fade]);
 return <Animated.Text accessible={false} style={[{position:'absolute',fontSize:21,color:'#fff5cb',opacity:fade,textShadowColor:gold,textShadowRadius:12},style]}>✦</Animated.Text>;
}
function Tile({icon,label,description,onPress,redTheme=false}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
 style={{flexGrow:1,flexBasis:'47%',minWidth:125,minHeight:125,borderRadius:24,borderWidth:1.5,borderColor:redTheme?'#f2a97d':'#eecf8a',backgroundColor:redTheme?'#42132f':'#0d3a68',overflow:'hidden',padding:12,justifyContent:'center',shadowColor:gold,shadowOpacity:.25,shadowRadius:10,elevation:3}}>
 <Glint style={{right:7,top:0,fontSize:13}}/>
 <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
  <Text style={{fontSize:38}}>{icon}</Text>
  <View style={{flex:1,gap:4}}>
   <Text numberOfLines={2} adjustsFontSizeToFit style={{fontSize:17,fontWeight:'900',color:'#fff'}}>{label}</Text>
   <Text numberOfLines={3} style={{fontSize:11,lineHeight:16,color:'#d9e7f7'}}>{description}</Text>
  </View>
  <Text style={{fontSize:23,color:gold}}>›</Text>
 </View>
 </Pressable>;
}
export default function FantasyLuxuryHome({leagueName,teamName,points,balance,playersCount,onNavigate=()=>{}}){
 const {width}=useWindowDimensions();
 const narrow=width<360;
 return <View style={{gap:15,paddingBottom:14}}>
  <View style={{...frame,minHeight:205,padding:18,backgroundColor:'#092449',justifyContent:'space-between',borderRadius:30}}>
   <Glint style={{top:3,left:15,fontSize:27}}/><Glint style={{bottom:5,right:14,fontSize:27}}/><Glint style={{top:31,right:68,fontSize:17}}/>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <Text style={{fontSize:10,letterSpacing:2.4,color:gold,fontWeight:'900'}}>VILLALBILLA C.F.</Text>
    <Image source={require('./assets/escudo-transparente.png')} resizeMode="contain" style={{width:37,height:54}}/>
   </View>
   <View style={{alignItems:'center',gap:5}}>
    <Text style={{fontSize:narrow?39:49,color:'#ffe8a5',fontWeight:'900',letterSpacing:1.4,textShadowColor:'#b17d2d',textShadowRadius:9}}>FANTASY</Text>
    <Text style={{textAlign:'center',fontSize:13,color:'#fff',fontWeight:'700'}}>Crea tu equipo · Compite · Demuestra tu talento</Text>
   </View>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end'}}>
    <Text style={{fontSize:21}}>🏆 ⚽</Text>
    <Text numberOfLines={1} style={{maxWidth:'70%',color:'#95dfff',fontSize:12,fontWeight:'800',textAlign:'right'}}>{leagueName||'Tu liga Fantasy'}</Text>
   </View>
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
   <Tile icon="👕" label="Mi equipo" description="Plantilla y alineación" onPress={()=>onNavigate('lineup')}/>
   <Tile icon="🏆" label="Clasificación" description="Puntos y posiciones" redTheme onPress={()=>onNavigate('table')}/>
   <Tile icon="🔁" label="Mercado" description="Fichajes y ofertas" onPress={()=>onNavigate('market')}/>
   <Tile icon="📅" label="Jornadas" description="Resultados y estadísticas" onPress={()=>onNavigate('rounds')}/>
  </View>
  <View style={{...frame,padding:15,gap:10}}>
   <Glint style={{right:6,bottom:0}}/>
   <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
    <FantasyIcon size={48}/>
    <View style={{flex:1,minWidth:0}}>
     <Text style={{fontSize:17,fontWeight:'900',color:'#fff'}} numberOfLines={2}>{teamName||'Mi equipo Fantasy'}</Text>
     <Text numberOfLines={1} style={{fontSize:12,color:'#c2d8ef'}}>{leagueName||'VillalbillaFantasy'}</Text>
    </View>
    <View style={{alignItems:'flex-end',paddingLeft:8,borderLeftWidth:1,borderColor:'#e9c476'}}>
     <Text style={{color:'#d5e1f2',fontSize:11}}>Puntos totales</Text>
     <Text style={{color:gold,fontSize:26,fontWeight:'900'}}>{Number.isFinite(Number(points))&&points!=null?Number(points).toLocaleString('es-ES'):'—'}</Text>
    </View>
   </View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
    {Number.isFinite(Number(balance))&&balance!=null&&<Text style={{color:gold,fontWeight:'800',fontSize:12}}>💰 Saldo: {Number(balance).toLocaleString('es-ES',{maximumFractionDigits:2})} M</Text>}
    {playersCount!=null&&<Text style={{color:'#b7e9ff',fontWeight:'800',fontSize:12}}>👥 {playersCount} jugadores</Text>}
   </View>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel="Gestionar mi plantilla" onPress={()=>onNavigate('lineup')} style={{borderRadius:27,backgroundColor:'#edc66e',padding:17,borderWidth:2,borderColor:'#fff0b5',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:15}}>
   <Text style={{fontSize:20}}>⚽</Text>
   <Text style={{fontSize:18,fontWeight:'900',color:'#211c18'}}>Gestionar mi equipo</Text>
   <Text style={{fontSize:24,fontWeight:'900',color:'#211c18'}}>›</Text>
  </Pressable>
 </View>;
}
