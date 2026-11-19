import React from 'react';
import {View,Text,Pressable,Platform} from 'react-native';
import theme from './fantasy-theme.cjs';

export default function FantasyNavigation({section,onChange,bottom=8}){
 const active=section==='offers'?'market':section;
 const tabs=[['plantilla','👕','Plantilla'],['lineup','⚽','11 inicial'],['market','🛒','Mercado'],['table','🏆','Clasificación'],['rounds','📅','Jornadas'],['rivals','⚔️','Rivales']];
 return <View accessibilityRole="tablist" style={{flexDirection:'row',backgroundColor:theme.navigation,borderTopWidth:1,borderColor:theme.border,paddingTop:8,paddingBottom:Math.max(bottom,8),paddingHorizontal:7,gap:3}}>
  {tabs.map(([id,emoji,label])=>{
   const selected=active===id;
   return <Pressable key={id} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected}}
     {...(Platform.OS==='web'?{'aria-selected':selected}:{})}
     onPress={()=>onChange(id)}
     style={{flex:1,minWidth:0,paddingTop:8,paddingBottom:7,alignItems:'center',justifyContent:'center',gap:5,
       borderRadius:16,backgroundColor:selected?'#15365d':theme.navigation,borderWidth:selected?1.7:1,borderColor:selected?'#efc56b':'transparent',
       shadowColor:'#edc66e',shadowOpacity:selected?.45:0,shadowRadius:8,elevation:selected?5:0}}>
    {selected&&<Text accessible={false} style={{position:'absolute',right:3,top:-2,color:'#fff1b2',fontSize:12}}>✦</Text>}
    <Text style={{fontSize:21}}>{emoji}</Text>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.6}
      style={{fontSize:9.5,fontWeight:selected?'900':'700',color:selected?'#f1cc7a':theme.text,textAlign:'center'}}>{label}</Text>
   </Pressable>
  })}
 </View>;
}
