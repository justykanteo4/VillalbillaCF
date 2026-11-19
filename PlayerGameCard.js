import React,{useEffect,useRef,useState} from 'react';
import {Image,Pressable,Text,TextInput,View,Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import PlayerPortrait from './PlayerPortrait';

const FIELDS=[['velocidad','VEL'],['tiro','TIR'],['pase','PAS'],['regate','REG'],['defensa','DEF'],['fisico','FIS']];
const DEFAULTS={velocidad:70,tiro:70,pase:70,regate:70,defensa:70,fisico:70};
const clamp=x=>Math.min(99,Math.max(1,Math.round(Number(x)||1)));
const label={color:'#b7ddfa',fontWeight:'900',fontSize:12};
const panel={backgroundColor:'#132d5c',borderWidth:1,borderColor:'#4a92e4',borderRadius:12,padding:11};
const btn={backgroundColor:'#b61d3c',padding:13,borderRadius:12,alignItems:'center',justifyContent:'center'};
const btnText={color:'#fff',fontWeight:'900',fontSize:14};

export default function PlayerGameCard({account,player,team}){
 const teamId=String(account?.claim?.teamId||''),playerId=String(account?.claim?.playerId||'');
 const storageKey='villalbilla.player-game-card.v1.'+String(account?.id||'')+'.'+teamId+'.'+playerId;
 const [nickname,setNickname]=useState(''),[dorsal,setDorsal]=useState(''),[position,setPosition]=useState(''),[ratings,setRatings]=useState(DEFAULTS);
 const [photo,setPhoto]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[editing,setEditing]=useState(false);
 const [showBack,setShowBack]=useState(false),[hydrated,setHydrated]=useState(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;setHydrated(false);setSaved(false);setPhoto(null);setNickname('');setDorsal('');setPosition('');setRatings(DEFAULTS);AsyncStorage.getItem(storageKey).then(raw=>{if(!mounted.current||!raw)return;const v=JSON.parse(raw);if(typeof v.nickname==='string')setNickname(v.nickname.slice(0,22));if(typeof v.dorsal==='string')setDorsal(v.dorsal);if(typeof v.position==='string')setPosition(v.position);if(v.ratings&&typeof v.ratings==='object')setRatings(Object.fromEntries(FIELDS.map(([key])=>[key,clamp(v.ratings[key]??70)])));if(typeof v.photo==='string'&&v.photo.startsWith(FileSystem.documentDirectory||'unavailable:'))FileSystem.getInfoAsync(v.photo).then(info=>{if(mounted.current&&info.exists)setPhoto(v.photo)}).catch(()=>{});}).catch(()=>{}).finally(()=>{if(mounted.current)setHydrated(true)});return()=>{mounted.current=false}},[storageKey]);
 const fullName=String(player?.alias||player?.name||account?.claim?.name||'Jugador').trim();
 const name=(nickname.trim()||fullName).slice(0,22).toUpperCase();
 const number=(dorsal.trim()||String(player?.number??'10')).slice(0,2);
 const role=(position||player?.position||'JUG').toUpperCase().slice(0,3);
 const avg=Math.round(FIELDS.reduce((sum,[key])=>sum+clamp(ratings[key]),0)/FIELDS.length);
 const persist=async(newPhoto=photo)=>{await AsyncStorage.setItem(storageKey,JSON.stringify({nickname:nickname.slice(0,22),dorsal:dorsal.slice(0,2),position,ratings,photo:newPhoto}));if(mounted.current)setSaved(true)};
 const choosePhoto=async()=>{
  if(busy||!hydrated)return;setBusy(true);setError('');
  try{
   const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[3,4],quality:.8});
   if(selected.canceled)return;
   const uri=selected.assets?.[0]?.uri;if(!uri)throw Error('Sin imagen');
   const resized=await ImageManipulator.manipulateAsync(uri,[{resize:{width:500}}],{compress:.72,format:ImageManipulator.SaveFormat.JPEG});
   const base=FileSystem.documentDirectory;if(!base)throw Error('Almacenamiento no disponible');
   const target=base+'player-card-'+encodeURIComponent(account.id)+'-'+playerId+'.jpg';
   await FileSystem.copyAsync({from:resized.uri,to:target});
   setPhoto(target);setSaved(false);
   await persist(target);
  }catch{setError('No se pudo guardar la fotografía en este dispositivo.')}finally{if(mounted.current)setBusy(false)}
 };
 const deletePhoto=async()=>{if(!photo)return;const old=photo;try{setPhoto(null);await persist(null);await FileSystem.deleteAsync(old,{idempotent:true})}catch{setError('No se pudo eliminar la foto local.')}};
 const changeRating=(key,delta)=>{setRatings(old=>({...old,[key]:clamp(old[key]+delta)}));setSaved(false)};
 return <View style={{gap:16}}>
  <View style={{alignItems:'center',gap:8}}>
   <Text style={{color:'#fff',fontSize:23,fontWeight:'900'}}>🎮 MI CARTA DE JUGADOR</Text>
   <Text style={{color:'#bacde7',textAlign:'center'}}>Carta personalizada · edición privada en tu dispositivo</Text>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={showBack?'Mostrar cara delantera de mi carta':'Girar mi carta'} onPress={()=>setShowBack(v=>!v)} style={{alignSelf:'center',width:'100%',maxWidth:380,padding:5,borderRadius:27,backgroundColor:'#f3c45c',borderWidth:1,borderColor:'#fff0ad',shadowColor:'#44b8ff',shadowOpacity:.65,shadowRadius:18,elevation:8}}>
   <View style={{borderRadius:23,backgroundColor:'#0d224a',padding:16,borderWidth:3,borderColor:'#2dbefa',gap:12,alignItems:'center'}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
     <View><Text style={{fontSize:43,fontWeight:'900',color:'#ffdc72'}}>{avg}</Text><Text style={{color:'#fff',fontWeight:'900'}}>{role}</Text></View>
     <Image source={require('./assets/escudo-transparente.png')} accessibilityLabel="Escudo original Villalbilla C.F." style={{width:72,height:94}} resizeMode="contain"/>
    </View>
    {showBack?<View style={{minHeight:204,justifyContent:'center',alignItems:'center',gap:12}}><Text style={{fontSize:54}}>🏟️</Text><Text style={{color:'#f8d77d',fontSize:22,fontWeight:'900'}}>VILLALBILLA C.F.</Text><Text style={{color:'#fff',fontSize:15,textAlign:'center'}}>TEMPORADA 2026/27</Text><Text style={{color:'#8de7ff'}}>Toca para volver a la carta</Text></View>:
     <View style={{width:'100%',alignItems:'center',backgroundColor:'#153f73',paddingVertical:14,borderRadius:17,borderWidth:1,borderColor:'#58bdeb'}}>
      {photo?<Image source={{uri:photo}} style={{width:150,height:185,borderRadius:14}} resizeMode="cover"/>:<PlayerPortrait playerId={playerId} name={fullName} teamId={teamId} size={154}/>}
     </View>}
    <View style={{backgroundColor:'#ac1935',width:'100%',borderRadius:14,padding:11,alignItems:'center'}}>
     <Text numberOfLines={1} adjustsFontSizeToFit style={{fontWeight:'900',fontSize:26,color:'#fff'}}>{name}</Text>
     <Text style={{color:'#ffe3a0',fontSize:16,fontWeight:'900'}}>Nº {number} · {team?.category||'VILLALBILLA C.F.'}</Text>
    </View>
    <View style={{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:7}}>
     {FIELDS.map(([key,abbr])=><View key={key} style={{width:'48%',flexGrow:1,flexDirection:'row',justifyContent:'space-between',backgroundColor:'#173d70',borderRadius:8,padding:9}}><Text style={label}>{abbr}</Text><Text style={{color:'#ffe18a',fontWeight:'900',fontSize:16}}>{ratings[key]}</Text></View>)}
    </View>
    <View style={{width:'100%',flexDirection:'row',gap:7}}>{[['PARTIDOS',player?.played],['GOLES',player?.goals],['ASIST.',player?.assists]].map(([key,value])=><View key={key} style={{flex:1,backgroundColor:'#651f47',borderRadius:10,alignItems:'center',padding:9}}><Text style={{color:'#f5da9d',fontWeight:'900',fontSize:10}}>{key}</Text><Text style={{color:'#fff',fontSize:20,fontWeight:'900'}}>{Number.isFinite(Number(value))&&value!=null?value:'—'}</Text></View>)}</View>
    <Text style={{color:'#9ab6da',fontSize:10,textAlign:'center'}}>Valoraciones de videojuego personalizables · No oficiales</Text>
    <Text style={{color:'#9ddfff',fontSize:11}}>↻ Toca la carta para girarla</Text>
   </View>
  </Pressable>
  <Pressable accessibilityRole="button" onPress={()=>setEditing(v=>!v)} style={btn}><Text style={btnText}>{editing?'Cerrar personalización':'✏️ Personalizar mi carta'}</Text></Pressable>
  {editing&&<View style={{...panel,gap:13}}>
   <Text style={{color:'#fff',fontWeight:'900',fontSize:17}}>Personalización</Text>
   <Text style={label}>Nombre o apodo de la carta</Text>
   <TextInput value={nickname} onChangeText={x=>{setNickname(x);setSaved(false)}} maxLength={22} placeholder="Usar nombre del jugador" placeholderTextColor="#869cbc" style={{color:'#fff',padding:11,borderRadius:10,backgroundColor:'#0a1b38'}}/>
   <Text style={label}>Dorsal (1-99)</Text>
   <TextInput value={dorsal} keyboardType="number-pad" onChangeText={x=>{setDorsal(x.replace(/[^0-9]/g,'').slice(0,2));setSaved(false)}} maxLength={2} placeholder={String(player?.number??10)} placeholderTextColor="#869cbc" style={{color:'#fff',padding:11,borderRadius:10,backgroundColor:'#0a1b38'}}/>
   <Text style={label}>Posición</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['POR','DEF','MED','DEL'].map(item=><Pressable key={item} accessibilityRole="button" onPress={()=>{setPosition(item);setSaved(false)}} style={{...btn,flexGrow:1,backgroundColor:position===item?'#b61d3c':'#254e82'}}><Text style={btnText}>{item}</Text></Pressable>)}</View>
   <Text style={{color:'#ffdb83',fontWeight:'900'}}>Valoraciones de fantasía (editables, no oficiales)</Text>
   {FIELDS.map(([key,abbr])=><View key={key} style={{flexDirection:'row',alignItems:'center',gap:13}}><Text style={{...label,flex:1}}>{abbr}</Text><Pressable accessibilityRole="button" accessibilityLabel={'Restar '+abbr} onPress={()=>changeRating(key,-1)} style={{...btn,padding:10}}><Text style={btnText}>−</Text></Pressable><Text style={{color:'#fff',fontSize:18,fontWeight:'900',minWidth:30,textAlign:'center'}}>{ratings[key]}</Text><Pressable accessibilityRole="button" accessibilityLabel={'Sumar '+abbr} onPress={()=>changeRating(key,1)} style={{...btn,padding:10}}><Text style={btnText}>+</Text></Pressable></View>)}
   <Text style={label}>Fotografía opcional (solo en este dispositivo)</Text>
   <Pressable accessibilityRole="button" disabled={busy||!hydrated} onPress={choosePhoto} style={btn}><Text style={btnText}>{busy?'Preparando fotografía…':'📷 Elegir fotografía'}</Text></Pressable>
   {photo&&<Pressable accessibilityRole="button" onPress={deletePhoto} style={{...btn,backgroundColor:'#354c69'}}><Text style={btnText}>Eliminar foto privada</Text></Pressable>}
   <Pressable accessibilityRole="button" disabled={!hydrated||busy} onPress={()=>persist().catch(()=>setError('No se pudo guardar la personalización.'))} style={btn}><Text style={btnText}>💾 Guardar carta</Text></Pressable>
   {!!saved&&<Text style={{color:'#98ebb9'}}>✓ Carta guardada en este dispositivo</Text>}
   {!!error&&<Text accessibilityRole="alert" style={{color:'#ffb9c3'}}>{error}</Text>}
  </View>}
  <Text style={{color:'#a3b9d2',fontSize:12,lineHeight:18,textAlign:'center'}}>La personalización no cambia las estadísticas oficiales ni publica fotografías. Las imágenes de menores deben utilizarse únicamente con autorización adecuada.</Text>
 </View>;
}
