import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import startup from './startup-screen-preference.cjs';
export default function StartupScreenPreference({account}){
 const [selected,setSelected]=useState('last'),[error,setError]=useState('');
 useEffect(()=>{let active=true;AsyncStorage.getItem(startup.KEY).then(value=>{if(active)setSelected(startup.choiceFor(value))}).catch(()=>{if(active)setError('No se pudo consultar la preferencia.');});return()=>{active=false}},[]);
 const choices=startup.choices.filter(choice=>choice.id!=='privado'&&choice.id!=='jugador'||choice.id==='privado'&&['admin','approved'].includes(account?.status)&&account?.claim?.role!=='player'||choice.id==='jugador'&&account?.status==='approved'&&account?.claim?.role==='player');
 async function choose(id){try{await AsyncStorage.setItem(startup.KEY,id);setSelected(id);setError('')}catch{setError('No se pudo guardar la pantalla de inicio.')}}
 return <View style={{padding:15,gap:12,borderRadius:12,backgroundColor:'#162544'}}>
  <Text style={{color:'#fff',fontSize:18,fontWeight:'800'}}>Pantalla de inicio</Text>
  <Text style={{color:'#aab8cb'}}>Elige qué ver cuando abras la aplicación. Si esa sección no está disponible para tu cuenta, se abrirá tu pantalla habitual.</Text>
  {choices.map(choice=><Pressable key={choice.id} accessibilityRole="radio" accessibilityState={{checked:selected===choice.id}} onPress={()=>choose(choice.id)} style={{padding:12,borderWidth:1,borderRadius:9,borderColor:selected===choice.id?'#91adff':'#334667',backgroundColor:selected===choice.id?'#1b2e69':'#101c2b'}}>
   <Text style={{color:'#fff'}}>{selected===choice.id?'◉ ':'○ '}{choice.name}</Text>
  </Pressable>)}
  {!!error&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{error}</Text>}
 </View>;
}
