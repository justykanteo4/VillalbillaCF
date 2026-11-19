import React,{useEffect,useState} from 'react';
import {View,Text,Image,TextInput,Pressable} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {manipulateAsync,SaveFormat} from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
const key='villalbilla.kids-card.v1';
export default function KidsPlayerCard(){
 const [alias,setAlias]=useState('MI JUGADOR'),[number,setNumber]=useState('10'),[position,setPosition]=useState('DEL'),[saved,setSaved]=useState(false);
 const [photo,setPhoto]=useState(null),[adultConfirm,setAdultConfirm]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;AsyncStorage.getItem(key).then(raw=>{if(!active||!raw)return;const value=JSON.parse(raw);setAlias(value.alias||'MI JUGADOR');setNumber(value.number||'10');setPosition(value.position||'DEL');if(value.photo)FileSystem.getInfoAsync(value.photo).then(info=>{if(active&&info.exists)setPhoto(value.photo)}).catch(()=>{})}).catch(()=>{});return()=>{active=false}},[]);
 const save=()=>{AsyncStorage.setItem(key,JSON.stringify({alias:alias.trim().slice(0,18)||'MI JUGADOR',number,position,photo})).then(()=>setSaved(true)).catch(()=>setSaved(false))};
 async function choosePhoto(){
  if(!adultConfirm||busy)return;
  setBusy(true);setError('');
  try{
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.65});
   if(result.canceled)return;
   const uri=result.assets?.[0]?.uri;
   if(!uri)throw Error('No se pudo obtener la imagen.');
   const reduced=await manipulateAsync(uri,[{resize:{width:400}}],{compress:0.72,format:SaveFormat.JPEG});
   const file=FileSystem.documentDirectory+'villalbilla-kids-card-photo.jpg';
   await FileSystem.copyAsync({from:reduced.uri,to:file});
   await AsyncStorage.setItem(key,JSON.stringify({alias:alias.trim().slice(0,18)||'MI JUGADOR',number,position,photo:file}));
   setPhoto(file);setAdultConfirm(false);setSaved(true);
  }catch{setError('No se pudo guardar la foto privada. Prueba con otra imagen.')}
  finally{setBusy(false)}
 }
 async function removePhoto(){
  try{await AsyncStorage.setItem(key,JSON.stringify({alias:alias.trim().slice(0,18)||'MI JUGADOR',number,position,photo:null}));setPhoto(null);setAdultConfirm(false);setSaved(true);await FileSystem.deleteAsync(FileSystem.documentDirectory+'villalbilla-kids-card-photo.jpg',{idempotent:true})}catch{setError('No se pudo eliminar la foto.')}
 }
 return <View style={{gap:15,alignItems:'center'}}>
 <View style={{width:'100%',maxWidth:340,borderRadius:28,padding:5,backgroundColor:'#e5bf50'}}>
 <View style={{padding:19,backgroundColor:'#102857',borderRadius:24,borderWidth:2,borderColor:'#5fbdf6',alignItems:'center',gap:12}}>
 <View style={{width:'100%',flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:'#ffe18a',fontSize:19,fontWeight:'900'}}>VILLALBILLA KIDS</Text><Text style={{color:'#fff',fontSize:22}}>⚽</Text></View>
 <View style={{width:140,height:150,borderRadius:20,backgroundColor:'#233e74',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#6eb9ef',overflow:'hidden'}}>{photo?<Image source={{uri:photo}} resizeMode="cover" style={{width:140,height:150}}/>:<><Text style={{fontSize:60}}>👤</Text><Text style={{color:'#dce6ff',fontSize:11}}>TU FOTO</Text></>}</View>
 <Image source={require('./assets/escudo-transparente.png')} style={{width:46,height:61}} resizeMode="contain"/>
 <Text style={{color:'#fff',fontSize:24,fontWeight:'900'}}>{alias.trim().slice(0,18).toUpperCase()||'MI JUGADOR'}</Text><Text style={{color:'#ffe18a',fontSize:23,fontWeight:'900'}}>{position} · Nº {number}</Text><Text style={{color:'#87dfff',fontSize:13,fontWeight:'800'}}>VILLALBILLA C.F.</Text>
 <View style={{width:'100%',flexDirection:'row',justifyContent:'space-around'}}>{[['⭐','ESFUERZO'],['🤝','EQUIPO'],['🎮','DIVERSIÓN']].map(([symbol,label])=><View key={label} style={{alignItems:'center',gap:4}}><Text style={{fontSize:25}}>{symbol}</Text><Text style={{fontSize:10,color:'#dce6ff',fontWeight:'800'}}>{label}</Text></View>)}</View>
 </View></View>
 <View style={{width:'100%',gap:10,padding:12,borderRadius:14,backgroundColor:'#1c345c'}}>
 <Text style={{color:'#fff',fontWeight:'900'}}>Personaliza tu carta (solo en este dispositivo)</Text>
 <TextInput accessibilityLabel="Apodo para tu carta" maxLength={18} value={alias} onChangeText={v=>{setAlias(v);setSaved(false)}} placeholder="Tu apodo" placeholderTextColor="#a6b9d7" style={{padding:12,color:'#fff',backgroundColor:'#102344',borderRadius:10}}/>
 <View style={{flexDirection:'row',gap:8}}>{['POR','DEF','MED','DEL'].map(p=><Pressable accessibilityRole="button" key={p} onPress={()=>{setPosition(p);setSaved(false)}} style={{flex:1,alignItems:'center',padding:10,backgroundColor:position===p?'#bd283f':'#304f80',borderRadius:8}}><Text style={{color:'#fff',fontWeight:'800',fontSize:11}}>{p}</Text></Pressable>)}</View>
 <Text style={{color:'#c1d3e7'}}>Dorsal</Text>
 <View style={{flexDirection:'row',gap:9,alignItems:'center'}}><Pressable accessibilityRole="button" onPress={()=>{setNumber(n=>String(Math.max(1,Number(n)-1)));setSaved(false)}} style={{padding:13,backgroundColor:'#304f80',borderRadius:8}}><Text style={{color:'#fff'}}>−</Text></Pressable><Text style={{color:'#fff',fontSize:20,fontWeight:'900'}}>{number}</Text><Pressable accessibilityRole="button" onPress={()=>{setNumber(n=>String(Math.min(99,Number(n)+1)));setSaved(false)}} style={{padding:13,backgroundColor:'#304f80',borderRadius:8}}><Text style={{color:'#fff'}}>+</Text></Pressable></View>
 <Pressable accessibilityRole="button" onPress={save} style={{padding:13,backgroundColor:'#ba243a',borderRadius:10}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'900'}}>Guardar mi carta</Text></Pressable>
 {saved&&<Text style={{color:'#9be8b6'}}>✓ Guardado en este dispositivo</Text>}
 </View>
 <View style={{width:'100%',gap:10,padding:12,borderRadius:14,backgroundColor:'#1c345c'}}>
 <Text style={{color:'#fff',fontSize:16,fontWeight:'900'}}>📷 Foto privada de la carta</Text>
 <Text style={{color:'#c1d3e7',fontSize:13,lineHeight:20}}>Un padre, madre o tutor puede elegir una foto desde este dispositivo. Se guarda en el almacenamiento privado de la aplicación. No se envía al servidor ni se muestra a otros usuarios.</Text>
 <Pressable accessibilityRole="checkbox" accessibilityState={{checked:adultConfirm}} onPress={()=>setAdultConfirm(v=>!v)} style={{padding:10,backgroundColor:'#2a4776',borderRadius:9}}><Text style={{color:'#fff',fontWeight:'700'}}>{adultConfirm?'☑':'☐'} Soy adulto responsable y autorizo guardar esta foto solo en este dispositivo</Text></Pressable>
 <Pressable accessibilityRole="button" disabled={!adultConfirm||busy} onPress={choosePhoto} style={{padding:13,backgroundColor:adultConfirm&&!busy?'#ba243a':'#506074',borderRadius:10}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'900'}}>{busy?'Guardando…':photo?'Cambiar foto privada':'Elegir foto privada'}</Text></Pressable>
 {photo&&<Pressable accessibilityRole="button" onPress={removePhoto} style={{padding:12,backgroundColor:'#374b68',borderRadius:10}}><Text style={{color:'#fff',textAlign:'center'}}>Eliminar mi foto</Text></Pressable>}
 {!!error&&<Text accessibilityRole="alert" style={{color:'#ffbbc3'}}>{error}</Text>}
 </View>
 <Text style={{color:'#ffd46a',fontSize:15,fontWeight:'900'}}>🚧 COMPARTIR CARTAS EN CONSTRUCCIÓN</Text>
 <Text style={{color:'#c1d3e7',fontSize:13,lineHeight:21,textAlign:'center'}}>La foto privada no se publica. Compartir cartas o fotos de menores requerirá autorización verificable y controles de privacidad antes de activarse.</Text>
 </View>
}
