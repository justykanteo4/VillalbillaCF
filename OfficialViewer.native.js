import React,{useState} from 'react';
import {View,Text,Pressable,Linking,ActivityIndicator} from 'react-native';
import {WebView} from 'react-native-webview';
export default function OfficialViewer({url,onClose}){
 const [failed,setFailed]=useState(false);
 return <View style={{flex:1,backgroundColor:'#0b121d'}}><View style={{padding:14,gap:12}}><Pressable onPress={onClose}><Text style={{fontSize:17,color:'#91adff'}}>← Volver al club</Text></Pressable><Text style={{color:"#dce6f2"}}>RFFM · Primera Aficionado · Grupo 4 · 2026/27</Text><Pressable onPress={()=>Linking.openURL(url).catch(()=>setFailed(true))}><Text style={{color:'#91adff'}}>Abrir en el navegador ↗</Text></Pressable></View>{failed?<Text style={{padding:20}}>No se pudo cargar la página. Comprueba tu conexión o abre el navegador.</Text>:<WebView source={{uri:url}} startInLoadingState renderLoading={()=><ActivityIndicator color="#91adff"/>} onError={()=>setFailed(true)} onHttpError={()=>setFailed(true)} onShouldStartLoadWithRequest={r=>r.url==='about:blank'||r.url.startsWith('https://')} style={{flex:1}}/>}</View>
}
