import appTheme from './app-theme';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PLAYER_VIEW_KEY='villalbilla.appearance.player-view.v1';
const modes=[['cards','Tarjetas con fotografías'],['list','Lista compacta']];

export async function readPlayerView(){
 try{return (await AsyncStorage.getItem(PLAYER_VIEW_KEY))==='list'?'list':'cards'}catch{return 'cards'}
}
export default function PlayerViewPreference(){
 const [mode,setMode]=useState('cards'),[error,setError]=useState('');
 useEffect(()=>{let mounted=true;readPlayerView().then(value=>{if(mounted)setMode(value)});return()=>{mounted=false}},[]);
 async function choose(value){
  try{await AsyncStorage.setItem(PLAYER_VIEW_KEY,value);setMode(value);setError('')}catch{setError('No se pudo guardar la vista en este dispositivo.')}
 }
 return <View style={{gap:12,padding:15,borderRadius:12,backgroundColor:'#162544'}}>
  <Text style={{color:'#fff',fontSize:18,fontWeight:'800'}}>Vista de jugadores</Text>
  <Text style={{color:'#aab8cb'}}>Elige cómo ver las plantillas de jugadores. El cambio solo afecta a este dispositivo.</Text>
  {modes.map(([id,label])=><Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:mode===id}} onPress={()=>choose(id)} style={{padding:13,borderRadius:10,borderWidth:1,borderColor:mode===id?appTheme.accent:'#334667',backgroundColor:mode===id?appTheme.selected:appTheme.surface}}>
   <Text style={{color:'#fff',fontWeight:mode===id?'800':'500'}}>{mode===id?'◉ ':'○ '}{label}</Text>
  </Pressable>)}
  {!!error&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{error}</Text>}
 </View>;
}
