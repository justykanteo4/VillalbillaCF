import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import WebView from 'react-native-webview';
import {cardAssets} from './card-template-assets';
import {renderCardDocument,W,H} from './card-template-renderer.cjs';

// Previsualización y descarga utilizan la misma composición sobre el PNG aprobado.
export default function CardTemplatePreview({name,number,role,avg,category,ratings,photo,played,goals,assists}){
 const [html,setHtml]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  setHtml(null);setError('');
  (async()=>{
   try{
    const assets=await cardAssets(photo);
    if(!active)return;
    setHtml(renderCardDocument({...assets,name,number,role,avg,category,ratings,played,goals,assists}));
   }catch(e){if(active)setError('No se pudo cargar la plantilla original.')}
  })();
  return()=>{active=false};
 },[name,number,role,avg,category,ratings,photo,played,goals,assists]);
 return <View style={{width:'100%',aspectRatio:W/H,backgroundColor:'#091634',borderRadius:18,overflow:'hidden'}}>
  {html?<WebView source={{html,baseUrl:'https://localhost/'}} originWhitelist={['*']} javaScriptEnabled scrollEnabled={false} pointerEvents="none" onMessage={event=>{try{if(JSON.parse(event.nativeEvent.data)?.error)setError('Error al mostrar la carta.')}catch{}}} style={{flex:1,backgroundColor:'transparent'}}/>:<Text style={{color:'#fff',textAlign:'center',marginTop:70}}>{error||'Preparando plantilla…'}</Text>}
 </View>;
}
