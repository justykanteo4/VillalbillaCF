import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import WebView from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import {Asset} from 'expo-asset';
import {cardSvg} from './card-export-svg.cjs';

async function fileBase64(uri){
 if(!uri)return '';
 const info=await FileSystem.getInfoAsync(uri);
 if(!info.exists)return '';
 return FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});
}
export default function CardTemplatePreview({name,number,role,avg,category,ratings,photo,played,goals,assists}){
 const [html,setHtml]=useState(null);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const asset=Asset.fromModule(require('./assets/escudo-transparente.png'));
    await asset.downloadAsync();
    const [crest,person]=await Promise.all([fileBase64(asset.localUri),fileBase64(photo)]);
    if(!active)return;
    const svg=cardSvg({name,number,position:role,average:avg,category,ratings,played,goals,assists,crest,photo:person,photoMime:/\.png(?:$|\?)/i.test(photo||'')?'png':'jpeg'});
    setHtml('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head><body style="margin:0;background:transparent;overflow:hidden">'+svg+'</body></html>');
   }catch{if(active)setHtml(null)}
  })();
  return()=>{active=false};
 },[name,number,role,avg,category,ratings,photo,played,goals,assists]);
 return <View style={{width:'100%',aspectRatio:800/1450,backgroundColor:'#091634',borderRadius:18,overflow:'hidden'}}>
  {html?<WebView key={html.length+'-'+String(photo)} originWhitelist={['*']} source={{html,baseUrl:'https://localhost/'}} javaScriptEnabled={false} scrollEnabled={false} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} pointerEvents="none" style={{flex:1,backgroundColor:'transparent'}}/>:<Text style={{color:'#fff',textAlign:'center',marginTop:70}}>Preparando plantilla…</Text>}
 </View>;
}
