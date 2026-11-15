import React from 'react';
import {Text} from 'react-native';
import {theme} from './FantasyUI';
const short={Portero:'POR',Defensa:'DEF',Mediocentro:'MED',Delantero:'DEL'};
export default function FantasyPlayerPosition({player,compact=false}){const position=typeof player?.position==='string'?player.position.trim():'',label=position||'Sin posición publicada';return <Text accessibilityLabel={'Posición: '+label+(player?.manualPosition?'. Guardada por entrenadores.':'')} numberOfLines={compact?1:2} style={{alignSelf:compact?'center':'flex-start',color:theme.accent,backgroundColor:theme.header,borderColor:theme.border,borderWidth:1,borderRadius:6,paddingHorizontal:compact?4:8,paddingVertical:3,fontSize:compact?9:12,fontWeight:'800',lineHeight:compact?12:16,maxWidth:'100%'}}>{compact?(short[position]||position.slice(0,3).toUpperCase()||'—'):label}</Text>}
