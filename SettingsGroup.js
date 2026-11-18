import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import fantasyTheme from './fantasy-theme.cjs';

export default function SettingsGroup({title,subtitle,children,initiallyOpen=false,appearance='fantasy'}){
 const [open,setOpen]=useState(initiallyOpen);
 const fantasy=appearance==='fantasy',accent=fantasy?fantasyTheme.accent:'#91adff';
 const background=fantasy?fantasyTheme.panel:'#162544',border=fantasy?fantasyTheme.border:'#334667';
 return <View style={{borderWidth:1,borderColor:border,borderRadius:14,backgroundColor:background,overflow:'hidden'}}>
  <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)} style={{padding:16,flexDirection:'row',alignItems:'center',gap:12}}>
   <View style={{flex:1,gap:3}}>
    <Text style={{color:fantasy?'#fff':'#fff',fontWeight:'800',fontSize:17}}>{title}</Text>
    {!!subtitle&&<Text style={{color:fantasy?fantasyTheme.muted:'#aab8cb',fontSize:12}}>{subtitle}</Text>}
   </View>
   <Text style={{color:accent,fontSize:19,fontWeight:'800'}}>{open?'⌃':'⌄'}</Text>
  </Pressable>
  {open&&<View style={{paddingHorizontal:12,paddingBottom:12,gap:12}}>{children}</View>}
 </View>;
}
