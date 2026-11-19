import React from 'react';
import {View,Text,Pressable} from 'react-native';
import FantasyIcon from './FantasyIcon';
import NewsFeatureBackdrop from './NewsFeatureBackdrop';

export default function FantasyNewsAccess({onPress}){
 return <Pressable accessibilityRole="button" accessibilityLabel="Abrir VillalbillaFantasy desde Noticias" onPress={onPress} style={{borderRadius:19,borderWidth:1.5,borderColor:'#64c5ff',overflow:'hidden',backgroundColor:'#0c244e',shadowColor:'#2d8bff',shadowOpacity:.48,shadowRadius:14,elevation:5}}>
  <NewsFeatureBackdrop variant="fantasy"/>
  <View style={{flexDirection:'row',alignItems:'center',paddingVertical:20,paddingHorizontal:15,gap:12,minHeight:159}}>
   <View style={{width:102,alignItems:'center',justifyContent:'center',gap:3}}>
    <Text style={{color:'#ffe18b',fontSize:45,textShadowColor:'#ff673e',textShadowRadius:9}}>🏆</Text>
    <Text style={{fontSize:27}}>⚽</Text>
   </View>
   <View style={{flex:1,gap:12}}>
    <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap'}}><Text style={{fontSize:23,fontWeight:'900',color:'#fff',fontStyle:'italic',textShadowColor:'#0a2864',textShadowRadius:6}}>Villalbilla</Text><Text style={{fontSize:23,fontWeight:'900',color:'#f3faff',fontStyle:'italic',textShadowColor:'#66c6ff',textShadowRadius:8}}>Fantasy</Text></View>
    <Text style={{color:'#fff',fontSize:13,lineHeight:20,fontWeight:'600',textShadowColor:'#091b39',textShadowRadius:4}}>Crea tu equipo, ficha jugadores y compite en la liga del club.</Text>
   </View>
   <Text style={{color:'#fff',fontSize:27,fontWeight:'900'}}>❯</Text>
  </View>
 </Pressable>;
}
