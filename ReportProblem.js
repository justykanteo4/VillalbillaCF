import appTheme from './app-theme';
import React,{useState} from 'react';
import {View,Text,TextInput,Pressable,Share,Platform} from 'react-native';

const areas=['Aplicación','Villalbilla Fantasy','Partidos y actas','Calendario','Acceso y cuenta'];
export default function ReportProblem(){
 const [area,setArea]=useState(areas[0]),[details,setDetails]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const report='Villalbilla C.F. · Informe de problema\nÁrea: '+area+'\nPlataforma: '+Platform.OS+'\nDescripción: '+details.trim();
 async function share(){
  setError('');setMessage('');
  if(details.trim().length<10){setError('Describe qué ocurre con al menos 10 caracteres.');return}
  try{
   if(Platform.OS==='web'){
    if(typeof navigator!=='undefined'&&typeof navigator.share==='function'){await navigator.share({title:'Problema Villalbilla C.F.',text:report});setMessage('Informe compartido desde el navegador.');return}
    if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(report);setMessage('Informe copiado. Pégalo en el canal de contacto del club.');return}
    setMessage('Selecciona y copia el informe del recuadro inferior para enviarlo al club.');
    return;
   }
   await Share.share({message:report,title:'Problema Villalbilla C.F.'});
   setMessage('Se ha abierto el menú de compartir. Elige dónde enviar el informe.');
  }catch{setError('No se pudo abrir Compartir. Puedes copiar el informe manualmente.')}
 }
 return <View style={{gap:13,padding:16,borderRadius:12,backgroundColor:'#162544'}}>
  <Text accessibilityRole="header" style={{color:'#fff',fontSize:21,fontWeight:'800'}}>Reportar un problema</Text>
  <Text style={{color:'#aab8cb'}}>Describe el error sin incluir contraseñas, teléfonos ni datos privados de menores. El informe no se envía hasta que tú lo compartas.</Text>
  <Text style={{color:'#fff',fontWeight:'700'}}>¿Dónde ocurre?</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   {areas.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:value===area}} onPress={()=>setArea(value)} style={{padding:9,borderWidth:1,borderColor:value===area?appTheme.accent:'#334667',backgroundColor:value===area?appTheme.selected:appTheme.surface,borderRadius:8}}>
    <Text style={{color:'#fff'}}>{value}</Text>
   </Pressable>)}
  </View>
  <TextInput multiline accessibilityLabel="Descripción del problema" placeholder="Qué estabas haciendo y qué ocurrió..." placeholderTextColor="#aab8cb" value={details} onChangeText={value=>setDetails(value.slice(0,1200))} style={{color:'#fff',backgroundColor:appTheme.surface,padding:12,borderRadius:10,borderWidth:1,borderColor:'#334667',minHeight:120,textAlignVertical:'top'}}/>
  <Pressable accessibilityRole="button" onPress={share} style={{padding:14,borderRadius:10,backgroundColor:appTheme.selected}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'800'}}>Compartir informe</Text></Pressable>
  {!!message&&<Text accessibilityRole="alert" style={{color:appTheme.accent}}>{message}</Text>}
  {!!error&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{error}</Text>}
  {details.trim().length>=10&&<TextInput multiline editable={false} selectTextOnFocus accessibilityLabel="Informe para copiar" value={report} style={{color:'#dce6f2',backgroundColor:appTheme.surface,padding:12,borderRadius:8,minHeight:105}}/>}
 </View>;
}
