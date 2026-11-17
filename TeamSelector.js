import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';
import teams from './teams.json';
export default function TeamSelector({value,onChange,options=teams,label='Equipo',theme,disabled=false}){
 const [open,setOpen]=useState(false);const selected=options.find(t=>t.id===value);
 return <View style={{gap:8}}><Text style={{color:theme?.muted||'#aab8cb',fontSize:12}}>{label}</Text><Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={{padding:14,borderRadius:12,backgroundColor:theme?.header||'#25364c'}}><Text style={{color:theme?.text||'#fff',fontWeight:'700'}}>{selected?selected.category+' · '+selected.name:'Selecciona un equipo'} {open?'⌃':'⌄'}</Text></Pressable>{open&&<ScrollView nestedScrollEnabled style={{maxHeight:280}}>{options.map(t=><Pressable key={t.id} disabled={disabled} accessibilityRole="radio" accessibilityState={{selected:value===t.id}} onPress={()=>{onChange(t.id);setOpen(false)}} style={{padding:14,backgroundColor:value===t.id?(theme?.panel||'#1b2e69'):(theme?.header||'#151f2d')}}><Text style={{color:theme?.text||'#fff'}}>{t.category} · {t.name}</Text></Pressable>)}</ScrollView>}</View>;
}
