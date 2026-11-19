import React,{useState} from 'react';
import {View,Pressable,Text,Platform} from 'react-native';
import WebView from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {Asset} from 'expo-asset';
import {cardSvg} from './card-export-svg.cjs';

const buttonStyle={backgroundColor:'#1475ba',padding:14,borderRadius:12,alignItems:'center'};
const textStyle={color:'#fff',fontWeight:'900',fontSize:15};
function decodeMessage(value){
 const parsed=JSON.parse(value);
 if(parsed?.error)throw Error(parsed.error);
 if(!parsed?.png||typeof parsed.png!=='string'||!/^[A-Za-z0-9+/=]+$/.test(parsed.png))throw Error('No se generó la imagen.');
 return parsed.png;
}
async function pngDataForAsset(source){
 const asset=Asset.fromModule(source);
 await asset.downloadAsync();
 if(!asset.localUri)throw Error('No se pudo leer el escudo oficial');
 return FileSystem.readAsStringAsync(asset.localUri,{encoding:FileSystem.EncodingType.Base64});
}
async function photoData(uri){
 if(!uri)return '';
 try{
  const result=await FileSystem.getInfoAsync(uri);
  if(!result.exists)return '';
  return await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});
 }catch{return ''}
}
function page(svg,crest,photo,photoMime){
 const serialized=JSON.stringify({svg,crest,photo,photoMime});
 return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#090e27"><canvas id="card" width="800" height="1450"></canvas><script>
 (async function(){
  try{
   const data=${serialized};
   const load=uri=>new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('No se pudo cargar una imagen'));
    image.src=uri;
   });
   const canvas=document.getElementById('card');
   const ctx=canvas.getContext('2d');
   const base=await load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data.svg));
   ctx.drawImage(base,0,0,800,1450);
   const drawContained=(image,x,y,w,h)=>{
    const ratio=Math.min(w/image.naturalWidth,h/image.naturalHeight);
    const width=image.naturalWidth*ratio,height=image.naturalHeight*ratio;
    ctx.drawImage(image,x+(w-width)/2,y+(h-height)/2,width,height);
   };
   if(data.photo){
    const person=await load('data:image/'+data.photoMime+';base64,'+data.photo);
    drawContained(person,179,399,443,310);
   }
   if(data.crest){
    const shield=await load('data:image/png;base64,'+data.crest);
    drawContained(shield,520,110,190,220);
   }
   window.ReactNativeWebView.postMessage(JSON.stringify({png:canvas.toDataURL('image/png').split(',')[1]}));
  }catch(error){window.ReactNativeWebView.postMessage(JSON.stringify({error:String(error)}))}
 })();
 </script></body></html>`;
}
export default function CardPngDownload({name,number,role,avg,category,ratings,photo,played,goals,assists}){
 const [html,setHtml]=useState(null),[working,setWorking]=useState(false),[message,setMessage]=useState('');
 const start=async()=>{
  if(working)return;
  setWorking(true);setMessage('');
  try{
   const [crest,photoBase64]=await Promise.all([pngDataForAsset(require('./assets/escudo-transparente.png')),photoData(photo)]);
   const photoMime=/\.png(?:$|\?)/i.test(photo||'')?'png':'jpeg';
   const svg=cardSvg({name,number,position:role,average:avg,category,ratings,played,goals,assists,showPhotoPlaceholder:!photoBase64});
   setHtml(page(svg,crest,photoBase64,photoMime));
  }catch(e){setWorking(false);setMessage('No se pudo preparar la descarga. '+String(e.message||''))}
 };
 const onMessage=async event=>{
  if(!working)return;
  setHtml(null);
  try{
   const image=decodeMessage(event.nativeEvent.data);
   const filename='Villalbilla-CF-carta-'+String(name||'jugador').replace(/[^a-zA-Z0-9-]/g,'-').slice(0,28)+'.png';
   const local=FileSystem.cacheDirectory+filename;
   await FileSystem.writeAsStringAsync(local,image,{encoding:FileSystem.EncodingType.Base64});
   if(Platform.OS==='android'){
    const permission=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if(permission.granted){
     const fileUri=await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri,filename.replace(/\.png$/i,''),'image/png');
     await FileSystem.writeAsStringAsync(fileUri,image,{encoding:FileSystem.EncodingType.Base64});
     setMessage('✓ Carta PNG guardada en la carpeta elegida.');
    }else if(await Sharing.isAvailableAsync()){
     await Sharing.shareAsync(local,{mimeType:'image/png',dialogTitle:'Guardar o compartir tu carta'});
     setMessage('Carta PNG preparada para guardar o compartir.');
    }else throw Error('Sin acceso al almacenamiento');
   }else if(await Sharing.isAvailableAsync()){
    await Sharing.shareAsync(local,{mimeType:'image/png',dialogTitle:'Guardar o compartir tu carta'});
    setMessage('Carta PNG preparada para guardar o compartir.');
   }else throw Error('No se puede abrir la descarga en este dispositivo');
  }catch(e){setMessage('No se pudo descargar la carta. '+String(e.message||''))}
  finally{setWorking(false)}
 };
 return <View style={{gap:7}}>
  <Pressable accessibilityRole="button" accessibilityLabel="Descargar carta como imagen PNG" disabled={working} onPress={start} style={[buttonStyle,working&&{opacity:.6}]}>
   <Text style={textStyle}>{working?'Preparando PNG…':'⬇️ Descargar carta PNG'}</Text>
  </Pressable>
  {!!message&&<Text accessibilityLiveRegion="polite" style={{color:'#c0e7ff',textAlign:'center',fontSize:12}}>{message}</Text>}
  {!!html&&<View pointerEvents="none" style={{position:'absolute',left:0,top:0,width:8,height:8,opacity:.01}}>
   <WebView originWhitelist={['*']} source={{html}} onMessage={onMessage} javaScriptEnabled scrollEnabled={false} onError={()=>{setHtml(null);setWorking(false);setMessage('Error al generar la imagen.')}} style={{width:8,height:8}}/>
  </View>}
 </View>;
}
