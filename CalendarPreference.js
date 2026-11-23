import appTheme from './app-theme';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import calendarPreference from './calendar-preference.cjs';

export default function CalendarPreference(){
 const [filter,setFilter]=useState('Próximos'),[error,setError]=useState('');
 useEffect(()=>{let alive=true;AsyncStorage.getItem(calendarPreference.KEY).then(value=>{if(alive)setFilter(calendarPreference.allowed(value))}).catch(()=>{if(alive)setError('No se pudo recuperar la preferencia.')});return()=>{alive=false}},[]);
 async function change(value){try{await AsyncStorage.setItem(calendarPreference.KEY,value);setFilter(value);setError('')}catch{setError('No se pudo guardar la preferencia.')}}
 return <View style={{padding:15,gap:12,borderRadius:12,backgroundColor:'#162544'}}>
  <Text accessibilityRole="header" style={{fontSize:20,fontWeight:'800',color:'#fff'}}>Preferencias de calendario</Text>
  <Text style={{color:'#aab8cb'}}>Elige qué partidos quieres ver al abrir el calendario. Puedes cambiar el filtro en cualquier momento.</Text>
  {calendarPreference.filters.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:filter===value}} onPress={()=>change(value)} style={{padding:13,borderWidth:1,borderColor:value===filter?appTheme.accent:'#334667',backgroundColor:value===filter?appTheme.selected:appTheme.surface,borderRadius:9}}><Text style={{color:'#fff'}}>{filter===value?'◉ ':'○ '}{value}</Text></Pressable>)}
  {!!error&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{error}</Text>}
 </View>;
}
