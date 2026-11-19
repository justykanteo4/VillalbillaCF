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
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel="Crear mi carta personalizada de Villalbilla C.F." onPress={()=>setOpen(v=>!v)} style={{borderRadius:18,padding:16,borderWidth:1,borderColor:'#5297e9',backgroundColor:'#112b52',gap:12}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:14}}>
    <View style={{width:84,height:102,backgroundColor:'#203b70',borderWidth:2,borderColor:'#ffcc68',borderRadius:15,alignItems:'center',justifyContent:'center'}}>
     <Image source={require('./assets/escudo-transparente.png')} accessibilityLabel="Escudo original de Villalbilla C.F." style={{width:48,height:65}} resizeMode="contain"/>
     <Text style={{color:'#ffe18a',fontWeight:'900',fontSize:10}}>TU CARTA</Text>
    </View>
    <View style={{flex:1,gap:5}}>
     <Text style={{color:'#ffe18a',fontSize:11,fontWeight:'800'}}>PERSONALIZA TU JUGADOR</Text>
     <Text style={{color:'#fff',fontSize:19,fontWeight:'900'}}>🃏 Crea tu carta</Text>
     <Text style={{color:'#bcd4f0',fontSize:13,lineHeight:18}}>Estilo videojuego, con el escudo original del Villalbilla C.F.</Text>
    </View>
   </View>
   <Text style={{color:'#89dafa',fontSize:14,fontWeight:'900'}}>{open?'Cerrar carta ↑':'Crear mi carta personalizada →'}</Text>
  </Pressable>
  {open&&<View style={{padding:13,borderRadius:16,backgroundColor:'#0c1a32',borderWidth:1,borderColor:'#345d91',gap:12}}>
   <Text style={{color:'#b4c8e2',fontSize:12}}>Personalización privada. La foto y los ajustes se guardan solo en este dispositivo. Las valoraciones no son estadísticas oficiales.</Text>
   <PlayerGameCard account={cardAccount} player={player} team={team}/>
  </View>}
 </View>;
}
