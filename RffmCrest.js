import React,{useState,useEffect} from 'react';
import {Image,Text,View} from 'react-native';
import {safeCrestUrl} from './rffm-crests.cjs';
// React Native / Fresco e iOS utilizan cache de imágenes; no guardamos binarios
// en AsyncStorage y no aumentamos el paquete de la APK.
export default function RffmCrest({uri,name='',size=38}){
 const [failed,setFailed]=useState(false);
 const safe=safeCrestUrl(uri);
 useEffect(()=>setFailed(false),[safe]);
 return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#172332',borderWidth:1,borderColor:'#364457',justifyContent:'center',alignItems:'center',overflow:'hidden'}}>
  {safe&&!failed?
   <Image accessible accessibilityLabel={'Escudo de '+name} source={{uri:safe,cache:'force-cache'}} onError={()=>setFailed(true)} resizeMode="contain" style={{width:size-5,height:size-5}}/>:
   <Text accessibilityLabel={name?'Escudo no disponible de '+name:'Escudo no disponible'} style={{fontSize:Math.round(size*.5)}}>⚽</Text>}
 </View>;
}
