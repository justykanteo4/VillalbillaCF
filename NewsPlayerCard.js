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
  <Pressable
   accessibilityRole="button"
   accessibilityState={{expanded:open}}
   accessibilityLabel="Crear mi carta personalizada de Villalbilla C.F."
   onPress={()=>setOpen(v=>!v)}
   style={{width:'100%',borderRadius:18,overflow:'hidden'}}
  >
   <Image
    source={require('./assets/news-player-card-banner.png')}
    accessibilityLabel="Banner Crea tu carta personalizada con fondo azul celeste"
    resizeMode="contain"
    style={{width:'100%',aspectRatio:3}}
   />
  </Pressable>
  {open&&<View style={{padding:13,borderRadius:16,backgroundColor:'#123566',borderWidth:1,borderColor:'#58b5ee',gap:12}}>
   <Text style={{color:'#b4c8e2',fontSize:12}}>Personalización privada. La foto y los ajustes se guardan solo en este dispositivo. Las valoraciones no son estadísticas oficiales.</Text>
   <PlayerGameCard account={cardAccount} player={player} team={team}/>
  </View>}
 </View>;
}
