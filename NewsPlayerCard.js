import React,{useState} from 'react';
import {View,Text,Pressable,Image,StyleSheet} from 'react-native';
import PlayerGameCard from './PlayerGameCard';
import teams from './teams.json';
import seed from './players-seed.json';

const banner=require('./assets/news-player-card-banner.png');
// En react-native-web Image.resolveAssetSource no existe.
const asset=typeof Image.resolveAssetSource==='function'?Image.resolveAssetSource(banner):banner;
const bannerRatio=asset?.width&&asset?.height?asset.width/asset.height:3;

export default function NewsPlayerCard({account}){
 const [open,setOpen]=useState(false);
 const approved=account?.status==='approved'&&account.claim?.role==='player';
 const current=approved?account.claim:null;
 const team=teams.find(t=>String(t.id)===String(current?.teamId||''))||null;
 const player=team?.id&&current?.playerId?seed.teams.find(t=>String(t.id)===String(team.id))?.players?.find(p=>String(p.id)===String(current.playerId)):null;
 // La versión pública crea únicamente una carta local. No accede a datos privados ni suplanta identidades.
 const cardAccount=approved?account:{id:'public-local-card',claim:{teamId:'',playerId:'',name:'Mi jugador'}};
 return <View style={styles.wrapper}>
  <Pressable
   accessibilityRole="button"
   accessibilityState={{expanded:open}}
   accessibilityLabel="Crear mi carta personalizada de Villalbilla C.F."
   onPress={()=>setOpen(v=>!v)}
   style={styles.banner}
  >
   <Image
    source={banner}
    accessibilityLabel="Banner Crea tu carta personalizada"
    resizeMode="contain"
    style={styles.image}
   />
  </Pressable>
  {open&&<View style={styles.editor}>
   <Text style={{color:'#b4c8e2',fontSize:12}}>Personalización privada. La foto y los ajustes se guardan solo en este dispositivo. Las valoraciones no son estadísticas oficiales.</Text>
   <PlayerGameCard account={cardAccount} player={player} team={team}/>
  </View>}
 </View>;
}
const styles=StyleSheet.create({
 wrapper:{gap:8,width:'100%',margin:0,padding:0},
 banner:{width:'100%',aspectRatio:bannerRatio,borderRadius:20,overflow:'hidden',backgroundColor:'#0b1429',borderWidth:0,margin:0,padding:0},
 // Mantiene la proporción original: no recorta ni estira el texto.
 image:{width:'100%',height:'100%'},
 editor:{padding:13,borderRadius:16,backgroundColor:'#123566',borderWidth:1,borderColor:'#58b5ee',gap:12}
});
