import React,{useState} from 'react';
import {View,Pressable,Text,Platform} from 'react-native';
import WebView from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {cardAssets} from './card-template-assets';
import {renderCardDocument} from './card-template-renderer.cjs';

const buttonStyle={backgroundColor:'#1475ba',padding:14,borderRadius:12,alignItems:'center'};
const textStyle={color:'#fff',fontWeight:'900',fontSize:15};
export default function CardPngDownload({name,number,role,avg,category,ratings,photo,played,goals,assists}){
 const [html,setHtml]=useState(null),[working,setWorking]=useState(false),[message,setMessage]=useState('');
 const start=async()=>{
  if(working)return;
  setWorking(true);setMessage('');
  try{
   const assets=await cardAssets(photo);
   setHtml(renderCardDocument({...assets,name,number,role,avg,category,ratings,played,goals,assists},true));
  }catch(e){setWorking(false);setMessage('No se pudo preparar la plantilla original. '+String(e?.message||''))}
 };
 const onMessage=async event=>{
  if(!working)return;
  setHtml(null);
  try{
   const data=JSON.parse(event.nativeEvent.data);
   if(data.error)throw Error(data.error);
   if(!data.png||!(/^[A-Za-z0-9+/=]+$/).test(data.png))throw Error('No se generó la imagen PNG.');
   const filename='Villalbilla-CF-carta-'+String(name||'jugador').replace(/[^a-zA-Z0-9-]/g,'-').slice(0,28)+'.png';
   const local=FileSystem.cacheDirectory+filename;
   await FileSystem.writeAsStringAsync(local,data.png,{encoding:FileSystem.EncodingType.Base64});
   if(Platform.OS==='android'){
    const permission=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if(permission.granted){
     const uri=await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri,filename.replace(/\.png$/i,''),'image/png');
     await FileSystem.writeAsStringAsync(uri,data.png,{encoding:FileSystem.EncodingType.Base64});
     setMessage('✓ Carta PNG guardada en la carpeta elegida.');
    }else if(await Sharing.isAvailableAsync()){
     await Sharing.shareAsync(local,{mimeType:'image/png',dialogTitle:'Guardar o compartir tu carta'});
     setMessage('Carta PNG preparada para compartir.');
    }else throw Error('No hay acceso al almacenamiento.');
   }else if(await Sharing.isAvailableAsync()){
    await Sharing.shareAsync(local,{mimeType:'image/png',dialogTitle:'Guardar o compartir tu carta'});
    setMessage('Carta PNG preparada para guardar o compartir.');
   }else throw Error('No se puede guardar la imagen aquí.');
  }catch(e){setMessage('No se pudo descargar la carta. '+String(e?.message||''))}
  finally{setWorking(false)}
 };
 return <View style={{gap:7}}>
  <Pressable accessibilityRole="button" accessibilityLabel="Descargar carta como PNG" disabled={working} onPress={start} style={[buttonStyle,working&&{opacity:.6}]}>
   <Text style={textStyle}>{working?'Preparando PNG…':'⬇️ Descargar carta PNG'}</Text>
  </Pressable>
  {!!message&&<Text accessibilityLiveRegion="polite" style={{color:'#c0e7ff',textAlign:'center',fontSize:12}}>{message}</Text>}
  {!!html&&<View pointerEvents="none" style={{position:'absolute',left:0,top:0,width:8,height:8,opacity:.01}}>
   <WebView originWhitelist={['*']} source={{html,baseUrl:'https://localhost/'}} onMessage={onMessage} javaScriptEnabled scrollEnabled={false} onError={()=>{setHtml(null);setWorking(false);setMessage('Error al generar la imagen PNG.')}} style={{width:8,height:8}}/>
  </View>}
 </View>;
}
