import React,{useState} from 'react';
import {View,Text,Pressable,Image} from 'react-native';
import PlayerGameCard from './PlayerGameCard';
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
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel="Crear mi carta personalizada de Villalbilla C.F." onPress={()=>setOpen(v=>!v)} style={{borderRadius:20,borderWidth:1.5,borderColor:'#68cfff',backgroundColor:'#1858a6',overflow:'hidden',shadowColor:'#268dff',shadowOpacity:.28,shadowRadius:9,elevation:3}}>
   <View style={{height:6,flexDirection:'row'}}><View style={{flex:1,backgroundColor:'#35c1ff'}}/><View style={{flex:1,backgroundColor:'#d81b3f'}}/></View>
   <View style={{flexDirection:'row',alignItems:'center',padding:15,gap:14}}>
    <View style={{width:103,height:119,backgroundColor:'#19417f',borderWidth:3,borderColor:'#f5d172',borderRadius:20,alignItems:'center',justifyContent:'space-around',paddingVertical:8,shadowColor:'#61d8ff',shadowOpacity:.6,shadowRadius:10}}>
     <Text style={{fontSize:18,fontWeight:'900',color:'#ffde78'}}>90</Text>
     <Image source={require('./assets/escudo-transparente.png')} accessibilityLabel="Escudo original de Villalbilla C.F." style={{width:44,height:57}} resizeMode="contain"/>
     <Text style={{color:'#fff',fontSize:10,fontWeight:'900'}}>TU CARTA ⭐</Text>
    </View>
    <View style={{flex:1,gap:7}}>
     <Text style={{color:'#ffe18a',fontSize:11,fontWeight:'900',letterSpacing:.4}}>PERSONALIZA TU JUGADOR</Text>
     <Text style={{color:'#fff',fontSize:21,lineHeight:25,fontWeight:'900'}}>Crea tu carta personalizada</Text>
     <Text style={{color:'#d9efff',fontSize:13,lineHeight:19}}>Diseña tu carta con foto, dorsal, posición y valoraciones.</Text>
     <Text style={{color:'#9ef1ff',fontSize:14,fontWeight:'900'}}>{open?'Cerrar carta  ⌃':'Crear mi carta  ❯'}</Text>
    </View>
   </View>
  </Pressable>
  {open&&<View style={{padding:13,borderRadius:16,backgroundColor:'#123566',borderWidth:1,borderColor:'#58b5ee',gap:12}}>
   <Text style={{color:'#b4c8e2',fontSize:12}}>Personalización privada. La foto y los ajustes se guardan solo en este dispositivo. Las valoraciones no son estadísticas oficiales.</Text>
   <PlayerGameCard account={cardAccount} player={player} team={team}/>
  </View>}
 </View>;
}
