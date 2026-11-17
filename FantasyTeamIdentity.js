import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Image} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {manipulateAsync,SaveFormat} from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import {Button,ErrorText,panel,title,text,input,theme} from './FantasyUI';

export function FantasyTeamPhoto({photo,size=48}){
 return photo?<Image source={{uri:photo}} style={{width:size,height:size,borderRadius:size/2,backgroundColor:theme.header}} resizeMode="cover"/>:
 <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:theme.header,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:theme.border}}><Text style={{...text,fontSize:size*.46}}>⚽</Text></View>;
}
export default function FantasyTeamIdentity({leagueId,request,onUpdated=()=>{}}){
 const [rows,setRows]=useState([]),[name,setName]=useState(''),[photo,setPhoto]=useState(null),[photoChanged,setPhotoChanged]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){
  try{
   const result=await request('/leagues/'+leagueId+'/team-profile',{cache:'reload'});
   setRows(result.teams||[]);
   const mine=result.teams?.find(t=>t.me);
   if(mine){setName(mine.name);setPhoto(mine.photo||null);setPhotoChanged(false)}
  }catch(e){setError(e.message||'No se pudo cargar el nombre de tu equipo.')}
 }
 useEffect(()=>{setRows([]);setName('');setPhoto(null);setPhotoChanged(false);load()},[leagueId]);
 async function chooseImage(){
  try{
   setError('');
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.6});
   if(result.canceled||!result.assets?.[0])return;
   const asset=result.assets[0];
   const reduced=await manipulateAsync(asset.uri,[{resize:{width:180,height:180}}],{compress:.5,format:SaveFormat.JPEG,base64:true});
   let encoded=reduced.base64;
   if(!encoded&&reduced.uri)encoded=await FileSystem.readAsStringAsync(reduced.uri,{encoding:FileSystem.EncodingType.Base64});
   if(!encoded||encoded.length+23>65000)throw Error('La foto pesa demasiado. Prueba con otra imagen.');
   setPhoto('data:image/jpeg;base64,'+encoded);setPhotoChanged(true);
  }catch(e){setError(e.message||'No se pudo preparar la fotografía.')}
 }
 async function save(){
  const next=name.trim().replace(/\s+/g,' ');
  if(next.length<2||next.length>32){setError('Escribe entre 2 y 32 caracteres.');return}
  setBusy(true);setError('');setNotice('');
  try{
   const payload={name:next};if(photoChanged)payload.photo=photo;
   await request('/leagues/'+leagueId+'/team-profile',{method:'POST',body:JSON.stringify(payload)});
   setNotice('Tu nombre y foto son visibles para los demás participantes.');
   await load();onUpdated();
  }catch(e){setError(e.message||'No se pudo guardar el equipo.')}
  finally{setBusy(false)}
 }
 return <View style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Mi equipo Fantasy</Text>
  <Text style={{...text,color:theme.muted}}>Este nombre y esta foto aparecerán en Rivales y Clasificación para todos los participantes de la liga.</Text>
  <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
   <FantasyTeamPhoto photo={photo} size={76}/>
   <View style={{flex:1,gap:8}}><Button secondary disabled={busy} onPress={chooseImage}>Elegir foto o escudo</Button>{!!photo&&<Button secondary disabled={busy} onPress={()=>{setPhoto(null);setPhotoChanged(true)}}>Quitar foto</Button>}</View>
  </View>
  <TextInput accessibilityLabel="Nombre de mi equipo Fantasy" value={name} maxLength={32} onChangeText={setName} placeholder="Nombre de tu equipo" placeholderTextColor={theme.muted} style={input}/>
  <Button disabled={busy||!rows.some(t=>t.me)} onPress={save}>{busy?'Guardando…':'Guardar nombre y foto'}</Button>
  {!!notice&&<Text style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </View>;
}
