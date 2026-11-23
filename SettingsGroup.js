import {DividerView} from './AppDividers';
import appTheme from './app-theme';
import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import fantasyTheme from './fantasy-theme.cjs';

export default function SettingsGroup({title,subtitle,children,initiallyOpen=false,appearance='fantasy'}){
 const [open,setOpen]=useState(initiallyOpen);
 const fantasy=appearance==='fantasy',accent=fantasy?fantasyTheme.accent:'#91adff';
 const background='#000',border='#303030';
 return <DividerView style={{borderTopWidth:appTheme.lineWidth,borderBottomWidth:appTheme.lineWidth,borderColor:border,borderRadius:0,backgroundColor:background,overflow:'hidden'}}>
  <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)} style={{paddingHorizontal:8,paddingVertical:15,flexDirection:'row',alignItems:'center',gap:12}}>
   <View style={{flex:1,gap:3}}>
    <Text style={{color:fantasy?'#fff':'#fff',fontWeight:'800',fontSize:17}}>{title}</Text>
    {!!subtitle&&<Text style={{color:fantasy?fantasyTheme.muted:'#aab8cb',fontSize:12}}>{subtitle}</Text>}
   </View>
   <Text style={{color:accent,fontSize:19,fontWeight:'800'}}>{open?'⌃':'⌄'}</Text>
  </Pressable>
  {open&&<View style={{paddingHorizontal:8,paddingBottom:12,gap:12}}>{children}</View>}
 </DividerView>;
}
