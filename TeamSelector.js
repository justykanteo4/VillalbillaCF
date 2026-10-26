import React,{useState} from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';
import teams from './teams.json';
export default function TeamSelector({value,onChange,options=teams,label='Equipo'}){
 const [open,setOpen]=useState(false);const selected=options.find(t=>t.id===value);
 return <View style={{gap:8}}><Text style={{color:'#aab8cb',fontSize:12}}>{label}</Text><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={{padding:14,borderRadius:12,backgroundColor:'#25364c'}}><Text style={{color:'#fff',fontWeight:'700'}}>{selected?selected.category+' · '+selected.name:'Selecciona un equipo'} {open?'⌃':'⌄'}</Text></Pressable>{open&&<ScrollView nestedScrollEnabled style={{maxHeight:280}}>{options.map(t=><Pressable key={t.id} accessibilityRole="radio" accessibilityState={{selected:value===t.id}} onPress={()=>{onChange(t.id);setOpen(false)}} style={{padding:14,backgroundColor:value===t.id?'#1b2e69':'#151f2d'}}><Text style={{color:'#fff'}}>{t.category} · {t.name}</Text></Pressable>)}</ScrollView>}</View>;
}
