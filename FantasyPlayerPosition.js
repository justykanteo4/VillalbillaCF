import React from 'react';
import {Text} from 'react-native';
import {theme} from './FantasyUI';
const colors={Portero:'#E8BE65',Defensa:'#237F49',Mediocentro:'#255C9B',Delantero:'#AD3238'};
const short={Portero:'POR',Defensa:'DEF',Mediocentro:'MED',Delantero:'DEL'};
export default function FantasyPlayerPosition({player,compact=false}){const position=typeof player?.position==='string'?player.position.trim():'',label=position||'Sin posición publicada';return <Text accessibilityLabel={'Posición: '+label+(player?.manualPosition?'. Guardada por entrenadores.':'')} numberOfLines={compact?1:2} style={{alignSelf:compact?'center':'flex-start',color:position==='Portero'?'#171717':colors[position]?'#FFFFFF':theme.accent,backgroundColor:colors[position]||theme.header,borderColor:colors[position]||theme.border,borderWidth:1,borderRadius:6,paddingHorizontal:compact?4:8,paddingVertical:3,fontSize:compact?9:12,fontWeight:'800',lineHeight:compact?12:16,maxWidth:'100%'}}>{compact?(short[position]||position.slice(0,3).toUpperCase()||'—'):label}</Text>}
