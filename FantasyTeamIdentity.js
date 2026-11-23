import {DividerView} from './AppDividers';
import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Image,Switch} from 'react-native';
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
 const [photoVisible,setPhotoVisible]=useState(true),[privacyRevision,setPrivacyRevision]=useState(0);
 async function load(){
  try{
   const result=await request('/leagues/'+leagueId+'/team-profile',{cache:'reload'});
   setRows(result.teams||[]);
   const mine=result.teams?.find(t=>t.me);
   if(mine){setName(mine.name);setPhoto(mine.photo||null);setPhotoChanged(false);setPhotoVisible(mine.photoVisible!==false);setPrivacyRevision(mine.privacyRevision??0)}
  }catch(e){setError(e.message||'No se pudo cargar el nombre de tu equipo.')}
 }
 useEffect(()=>{setRows([]);setName('');setPhoto(null);setPhotoChanged(false);setPhotoVisible(true);setPrivacyRevision(0);load()},[leagueId]);
 async function chooseImage(){
  try{
   setError('');
   const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.6});
   if(result.canceled||!result.assets?.[0])return;
   const asset=result.assets[0];
   const reduced=await manipulateAsync(asset.uri,[{resize:{width:96,height:96}}],{compress:.3,format:SaveFormat.JPEG,base64:true});
   let encoded=reduced.base64;
   if(!encoded&&reduced.uri)encoded=await FileSystem.readAsStringAsync(reduced.uri,{encoding:FileSystem.EncodingType.Base64});
   if(!encoded||encoded.length+23>65000)throw Error('No se ha podido reducir la foto. Prueba con otra imagen.');
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
   setNotice('Cambios de equipo guardados.'+(photoVisible?' Tu foto es visible para el resto.':' Tu foto sigue oculta para otros participantes.'));
   await load();onUpdated();
  }catch(e){setError(e.message||'No se pudo guardar el equipo.')}
  finally{setBusy(false)}
 }
 async function changePhotoVisibility(visible){
  if(busy||!rows.some(row=>row.me))return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await request('/leagues/'+leagueId+'/team-privacy',{method:'POST',body:JSON.stringify({visible,revision:privacyRevision})});
   setPhotoVisible(result.visible);setPrivacyRevision(result.revision);
   setNotice(result.visible?'Tu foto vuelve a ser visible para los demás participantes.':'Foto oculta a los rivales y en la clasificación. Tú la seguirás viendo.');
  }catch(e){setError(e.message||'No se pudo cambiar la privacidad.');await load()}
  finally{setBusy(false)}
 }
 return <DividerView style={{...panel,gap:12}}>
  <Text style={{...title,fontSize:20}}>Mi equipo Fantasy</Text>
  <Text style={{...text,color:theme.muted}}>El nombre identifica a tu equipo dentro de la liga. Tú decides si los demás pueden ver su foto.</Text>
  <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
   <FantasyTeamPhoto photo={photo} size={76}/>
   <View style={{flex:1,gap:8}}><Button secondary disabled={busy} onPress={chooseImage}>Elegir foto o escudo</Button>{!!photo&&<Button secondary disabled={busy} onPress={()=>{setPhoto(null);setPhotoChanged(true)}}>Quitar foto</Button>}</View>
  </View>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,padding:12,backgroundColor:theme.header,borderRadius:10}}>
   <View style={{flex:1,gap:4}}>
    <Text style={{...text,fontWeight:'800'}}>Mostrar mi foto a otros participantes</Text>
    <Text style={{...text,fontSize:12,color:theme.muted}}>{photoVisible?'Visible en Rivales y Clasificación':'Privada: solo la ves tú'}</Text>
   </View>
   <Switch accessibilityLabel="Mostrar foto de equipo Fantasy a otros participantes" value={photoVisible} disabled={busy||!rows.some(t=>t.me)} onValueChange={changePhotoVisibility} trackColor={{false:theme.border,true:theme.accent}} thumbColor={theme.text}/>
  </View>
  <TextInput accessibilityLabel="Nombre de mi equipo Fantasy" value={name} maxLength={32} onChangeText={setName} placeholder="Nombre de tu equipo" placeholderTextColor={theme.muted} style={input}/>
  <Button disabled={busy||!rows.some(t=>t.me)} onPress={save}>{busy?'Guardando…':'Guardar nombre y foto'}</Button>
  {!!notice&&<Text style={{...text,color:theme.accent}}>{notice}</Text>}
  <ErrorText>{error}</ErrorText>
 </DividerView>;
}
