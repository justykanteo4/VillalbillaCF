import React from 'react';
import {View,Text,Pressable} from 'react-native';
import {text,theme} from './FantasyUI';

export default function FantasyOrder({value,onChange}) {
 return <View accessibilityLabel="Ordenar listado" style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
  {[['points','Más puntos primero'],['name','Nombre A–Z']].map(([id,label])=>
   <Pressable key={id} accessibilityRole="radio" accessibilityState={{selected:value===id}}
    onPress={()=>onChange(id)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:12,
     borderWidth:1,borderColor:value===id?theme.accent:theme.border,borderRadius:8}}>
    <Text style={{...text,color:value===id?theme.accent:theme.text}}>{label}</Text>
   </Pressable>)}
 </View>;
}
