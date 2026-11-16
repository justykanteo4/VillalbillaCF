import React from 'react';
import {Animated,Image,StyleSheet,Text,View} from 'react-native';
import PlayerPortrait from './PlayerPortrait';
import FantasyPlayerPosition from './FantasyPlayerPosition';

const artwork=require('./assets/fantasy/player-card-2027.webp');
const number=value=>Number.isFinite(value)?value.toLocaleString('es-ES',{maximumFractionDigits:2}):'—';

export default function FantasyRevealCard({player,progress,opened,reduced,width,paid,auction,showPrice}){
  const metrics=[
    ['Puntos',number(player.fantasyPoints)],
    ['Valor',Number.isFinite(player.price)?number(player.price)+' M':'—'],
    ['Goles',number(player.stats?.goals??player.goals)],
    ['Partidos',number(player.stats?.played??player.played)],
  ];
  const entrance=reduced?[]:[
    {perspective:900},
    {translateY:progress.interpolate({inputRange:[0,.32,.78,1],outputRange:[68,68,-10,0]})},
    {rotateY:progress.interpolate({inputRange:[0,.33,.69,.87,1],outputRange:['-86deg','-86deg','21deg','-8deg','0deg']})},
    {rotateZ:progress.interpolate({inputRange:[0,.42,.75,1],outputRange:['-12deg','-12deg','4deg','0deg']})},
    {scale:progress.interpolate({inputRange:[0,.32,.8,1],outputRange:[.68,.68,1.045,1]})},
  ];
  return <Animated.View accessibilityElementsHidden={!opened} importantForAccessibility={opened?'yes':'no-hide-descendants'} pointerEvents={opened?'auto':'none'} style={{width,alignItems:'center',gap:6,opacity:reduced?progress:progress.interpolate({inputRange:[0,.32,.55,1],outputRange:[0,0,1,1]}),transform:entrance}}>
    <View style={[styles.card,{width,height:width*4/3}]}>
      <Image source={artwork} resizeMode="stretch" style={{position:'absolute',top:0,left:0,width,height:width*4/3}} accessible={false}/>
      <View style={styles.portrait}>
        <PlayerPortrait playerId={player.id||player.playerId} teamId={player.teamId} name={player.name} photo={player.photo} size={Math.round(width*.42)} style={styles.photo}/>
      </View>
      <View style={styles.position}><FantasyPlayerPosition player={player} compact/></View>
      <View style={styles.nameBand}>
        <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.7} style={[styles.name,{fontSize:Math.round(width*.064)}]}>{player.name}</Text>
      </View>
      <View style={styles.metrics}>
        {metrics.map(([label,value])=><View key={label} style={styles.metric}>
          <Text style={[styles.value,{fontSize:Math.round(width*.057)}]}>{value}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>)}
      </View>
    </View>
    {showPrice&&<Text style={styles.paid}>{auction?'Puja ganadora':'Precio del fichaje'} · {number(paid)} M</Text>}
    {player.partial&&<Text style={styles.partial}>Estadísticas confirmadas</Text>}
  </Animated.View>;
}

const styles=StyleSheet.create({
  card:{position:'relative',overflow:'hidden'},
  portrait:{position:'absolute',top:'15%',left:0,right:0,alignItems:'center'},
  photo:{borderWidth:2,borderColor:'#FFE19B',backgroundColor:'#102742'},
  position:{position:'absolute',left:'14%',top:'24%',maxWidth:'16%'},
  nameBand:{position:'absolute',top:'48%',left:'11%',right:'11%',height:'10%',justifyContent:'center',paddingHorizontal:5},
  name:{color:'#FFF1CD',fontWeight:'900',textAlign:'center',textShadowColor:'#030815',textShadowOffset:{width:0,height:2},textShadowRadius:4},
  metrics:{position:'absolute',top:'61%',left:'20%',right:'20%',height:'21%',flexDirection:'row',flexWrap:'wrap',alignItems:'center'},
  metric:{width:'50%',alignItems:'center',justifyContent:'center'},
  value:{color:'#FFD98A',fontWeight:'900'},
  label:{color:'#F4F1EA',fontSize:9,fontWeight:'800',textTransform:'uppercase'},
  paid:{color:'#FFE4A3',fontSize:15,fontWeight:'800',textAlign:'center'},
  partial:{color:'#CFD5E0',fontSize:11,textAlign:'center'},
});
