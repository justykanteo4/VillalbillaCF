import React,{useState} from 'react';
import {View,Text,Pressable,Image} from 'react-native';
import PlayerGameCard from './PlayerGameCard';
import NewsFeatureBackdrop from './NewsFeatureBackdrop';
import teams from './teams.json';
import seed from './players-seed.json';

export default function NewsPlayerCard({account}){
 const [open,setOpen]=useState(false);
 const approved=account?.status==='approved'&&account.claim?.role==='player';
 const current=approved?account.claim:null;
 const team=teams.find(t=>String(t.id)===String(current?.teamId||''))||null;
 const player=team?.id&&current?.playerId?seed.teams.find(t=>String(t.id)===String(team.id))?.players?.find(p=>String(p.id)===String(current.playerId)):null;
 // La versión pública crea únicamente una carta local. No accede a datos privados ni suplanta identidades.
 const cardAccount=approved?account:{id:'public-local-card',claim:{teamId:'',playerId:'',name:'Mi jugador'}};
 return <View style={{gap:12}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel="Crear mi carta personalizada de Villalbilla C.F." onPress={()=>setOpen(v=>!v)} style={{borderRadius:19,borderWidth:1.5,borderColor:'#e45d9a',backgroundColor:'#112957',overflow:'hidden',shadowColor:'#ff4190',shadowOpacity:.35,shadowRadius:13,elevation:5}}>
   <NewsFeatureBackdrop variant="card"/>
   <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:16,paddingHorizontal:14,minHeight:163}}>
    <View style={{width:105,height:133,borderRadius:14,borderWidth:3,borderColor:'#55ceff',backgroundColor:'#102657',transform:[{rotate:'-7deg'}],alignItems:'center',justifyContent:'space-around',padding:6,shadowColor:'#3dd5ff',shadowOpacity:1,shadowRadius:12,elevation:9}}>
      <View style={{alignSelf:'stretch',flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:'#ffe175',fontWeight:'900',fontSize:23}}>90</Text><Image source={require('./assets/escudo-transparente.png')} accessibilityLabel="Escudo original de Villalbilla C.F." style={{width:33,height:42}} resizeMode="contain"/></View>
      <Text style={{fontSize:43}}>👤</Text>
      <Text style={{color:'#ffda75',fontSize:17,letterSpacing:1}}>★★★★★</Text>
    </View>
    <View style={{flex:1,gap:13}}>
     <Text style={{color:'#fff',fontSize:21,lineHeight:25,fontWeight:'900',textShadowColor:'#0c2344',textShadowRadius:7}}>Crea tu carta personalizada</Text>
     <Text style={{color:'#fff',fontSize:13,lineHeight:19,textShadowColor:'#0c2344',textShadowRadius:6}}>Diseña tu propia carta de jugador con tu foto, posición y estadísticas.</Text>
    </View>
    <Text style={{color:'#fff',fontSize:27,fontWeight:'900'}}>❯</Text>
   </View>
  </Pressable>
  {open&&<View style={{padding:13,borderRadius:16,backgroundColor:'#123566',borderWidth:1,borderColor:'#58b5ee',gap:12}}>
   <Text style={{color:'#b4c8e2',fontSize:12}}>Personalización privada. La foto y los ajustes se guardan solo en este dispositivo. Las valoraciones no son estadísticas oficiales.</Text>
   <PlayerGameCard account={cardAccount} player={player} team={team}/>
  </View>}
 </View>;
}
