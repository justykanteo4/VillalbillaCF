import React,{useEffect,useState} from 'react';
import {View,Pressable,Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {api} from './api';
import PlayerPortrait from './PlayerPortrait';
import {getPlayerPhoto} from './player-photos';
import {detectPlayer} from './team-experience.cjs';
import seed from './players-seed.json';
export default function CoachAvatar({account,teamId}){
 const name=account.claim?.name||account.name,player=account.claim?.playerTeams?.[0],detected=player?.playerId||detectPlayer(name,seed.teams.flatMap(t=>t.players))?.id,official=getPlayerPhoto(detected),key='villalbilla.coach-photo.'+account.id;
 const [manual,sm]=useState(null),[federationPhoto,sf]=useState(null),[failedOfficial,sfFailed]=useState(false),[error,se]=useState('');
 useEffect(()=>{let active=true;sf(null);if(!teamId||official)return;api('/api/report-membership?team='+teamId+'&name='+encodeURIComponent(name)+'&offset=0',{onUpdate:v=>{if(active&&v.photo)sf(v.photo)}}).then(v=>{if(active&&v.photo)sf(v.photo)}).catch(()=>{});return()=>{active=false}},[teamId,name,official]);
 const hasOfficial=failedOfficial?null:official||federationPhoto;
 useEffect(()=>{let active=true;sm(null);AsyncStorage.getItem(key).then(value=>{if(active)sm(value)}).catch(()=>{});return()=>{active=false}},[key]);
 async function choose(){try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8});if(result.canceled)return;const asset=result.assets?.[0];if(!asset?.uri)throw Error();const image=await ImageManipulator.manipulateAsync(asset.uri,[{resize:{width:256}}],{compress:.7,format:ImageManipulator.SaveFormat.JPEG,base64:true});if(!image.base64)throw Error();const value='data:image/jpeg;base64,'+image.base64;await AsyncStorage.setItem(key,value);sm(value);se('')}catch{se('No se pudo guardar la foto.')}}
 return <View style={{alignItems:'center',gap:3}}><Pressable accessibilityRole="button" accessibilityLabel={hasOfficial?'Foto de la ficha del entrenador':'Añadir o cambiar foto del entrenador'} onPress={hasOfficial?undefined:choose} disabled={!!hasOfficial}><PlayerPortrait playerId={detected} name={name} photo={hasOfficial||manual} onPhotoError={()=>sfFailed(true)} disableLookup size={42}/>{!hasOfficial&&!manual&&<Text style={{color:'#91adff',fontSize:9}}>+ Foto</Text>}</Pressable>{!!error&&<Text style={{color:'#ffc1c9',fontSize:9,maxWidth:100}}>{error}</Text>}</View>;
}
