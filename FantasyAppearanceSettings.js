import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,useColorScheme} from 'react-native';
import {Button,panel,text,title,theme} from './FantasyUI';
import {getFantasyThemeMode,subscribeFantasyTheme,changeFantasyTheme,initializeFantasyTheme} from './fantasy-appearance';
const MODES=[['auto','Automático'],['light','Claro'],['dark','Oscuro']];
export default function FantasyAppearanceSettings(){
 const [selected,setSelected]=useState(getFantasyThemeMode()),[error,setError]=useState(''),[saving,setSaving]=useState(false),scheme=useColorScheme();
 useEffect(()=>{initializeFantasyTheme().catch(()=>{});return subscribeFantasyTheme(()=>setSelected(getFantasyThemeMode()))},[]);
 const choose=async value=>{if(saving)return;setSaving(true);setError('');try{await changeFantasyTheme(value)}catch{setError('No se pudo guardar la apariencia.')}finally{setSaving(false)}};
 return <View style={panel}>
  <Text style={title}>Apariencia de Fantasy</Text>
  <Text style={{...text,color:theme.muted}}>Elige el tema de Villalbilla Fantasy. Automático utiliza el ajuste del dispositivo ({scheme==='light'?'claro':'oscuro'}).</Text>
  {MODES.map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:selected===value,disabled:saving}} onPress={()=>choose(value)} disabled={saving} style={{padding:14,borderWidth:1,borderRadius:10,borderColor:selected===value?theme.accent:theme.border,backgroundColor:theme.header}}>
    <Text style={{...text,fontWeight:selected===value?'900':'600'}}>{selected===value?'● ':'○ '}{label}</Text>
   </Pressable>)}
  {!!error&&<Text accessibilityRole="alert" style={{...text,color:theme.negative}}>{error}</Text>}
 </View>
}
