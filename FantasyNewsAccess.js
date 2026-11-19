import React from 'react';
import {View,Text,Pressable} from 'react-native';
import FantasyIcon from './FantasyIcon';
export default function FantasyNewsAccess({onPress}){
 return <Pressable accessibilityRole="button" accessibilityLabel="Abrir VillalbillaFantasy desde Noticias" onPress={onPress} style={{borderRadius:20,borderWidth:1.5,borderColor:'#4d9fff',backgroundColor:'#123d87',overflow:'hidden',shadowColor:'#2b9fff',shadowOpacity:.25,shadowRadius:10,elevation:3}}>
  <View style={{height:6,flexDirection:'row'}}><View style={{flex:1,backgroundColor:'#d62041'}}/><View style={{flex:1,backgroundColor:'#42c5ff'}}/></View>
  <View style={{padding:16,flexDirection:'row',alignItems:'center',gap:15}}>
   <View style={{width:100,height:110,borderRadius:16,backgroundColor:'#1b58a3',borderWidth:1,borderColor:'#66d6ff',alignItems:'center',justifyContent:'center'}}>
    <FantasyIcon size={82}/>
   </View>
   <View style={{flex:1,gap:7}}>
    <Text style={{color:'#ffdc70',fontSize:11,fontWeight:'900',letterSpacing:1}}>LA LIGA DEL CLUB</Text>
    <Text style={{color:'#fff',fontSize:21,fontWeight:'900'}} numberOfLines={2}>VillalbillaFantasy</Text>
    <Text style={{color:'#d6edff',fontSize:13,lineHeight:20}}>Crea tu equipo, ficha jugadores y compite en tu liga Fantasy.</Text>
    <Text style={{color:'#8ee9ff',fontSize:14,fontWeight:'900'}}>Entrar en Fantasy  ❯</Text>
   </View>
  </View>
 </Pressable>;
}
