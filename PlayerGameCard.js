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
  <Pressable accessibilityRole="button" accessibilityLabel={showBack?'Mostrar cara delantera de mi carta':'Girar mi carta'} onPress={()=>setShowBack(v=>!v)} style={cardStyle.frame}>
   <View style={cardStyle.card}>
    <View style={cardStyle.top}>
     <View style={cardStyle.ratingPanel}>
      <Text style={cardStyle.laurels}>❧</Text>
      <Text style={cardStyle.overall}>{avg}</Text>
      <Text style={cardStyle.role}>{role}</Text>
      <Text style={cardStyle.striker}>⚽</Text>
     </View>
     <View style={cardStyle.crestPanel}>
      <Image source={require('./assets/escudo-transparente.png')} accessibilityLabel="Escudo original Villalbilla C.F." style={cardStyle.crest} resizeMode="contain"/>
      <Text style={cardStyle.clubName}>VILLALBILLA C.F.</Text>
     </View>
    </View>
    {showBack?
     <View style={cardStyle.backPanel}>
      <Image source={require('./assets/escudo-transparente.png')} accessibilityLabel="Escudo original Villalbilla C.F." style={{width:110,height:140}} resizeMode="contain"/>
      <Text style={cardStyle.backName}>VILLALBILLA C.F.</Text>
      <Text style={{color:'#fff',fontWeight:'900'}}>TEMPORADA 2026/27</Text>
      <Text style={{color:'#9deaff'}}>Toca para volver a la carta</Text>
     </View>:
     <View style={cardStyle.portraitArea}>
      <View style={cardStyle.portraitGlow}/>
      {photo?<Image source={{uri:photo}} style={cardStyle.portrait} resizeMode="contain"/>:
       <PlayerPortrait playerId={playerId} name={fullName} teamId={teamId} size={154}/>}
     </View>}
    <View style={cardStyle.nameBar}>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={cardStyle.playerName}>{name}</Text>
     <View style={cardStyle.numberBox}><Text style={cardStyle.numberText}>{number}</Text></View>
    </View>
    <View style={cardStyle.ratingsGrid}>
     <View style={cardStyle.ratingColumn}>
      {['velocidad','regate','tiro'].map((key,index)=><View key={key} style={cardStyle.statLine}>
       <Text style={cardStyle.statIcon}>{['⚡','⚽','◎'][index]}</Text>
       <Text style={cardStyle.statText}>{['VELOCIDAD','REGATE','TIRO'][index]}</Text>
       <Text style={cardStyle.statNumber}>{ratings[key]}</Text>
      </View>)}
     </View>
     <View style={cardStyle.ratingColumn}>
      {['pase','defensa','fisico'].map((key,index)=><View key={key} style={cardStyle.statLine}>
       <Text style={cardStyle.statIcon}>{['⚽','⬡','💪'][index]}</Text>
       <Text style={cardStyle.statText}>{['PASE','DEFENSA','FÍSICO'][index]}</Text>
       <Text style={cardStyle.statNumber}>{ratings[key]}</Text>
      </View>)}
     </View>
    </View>
    <View style={cardStyle.matchRow}>
     {[['⚽','PARTIDOS',player?.played],['⚽','GOLES',player?.goals],['🏆','ASISTENCIAS',player?.assists]].map(([symbol,key,value])=><View key={key} style={cardStyle.matchBox}>
      <Text style={{fontSize:20}}>{symbol}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={cardStyle.matchLabel}>{key}</Text>
      <Text style={cardStyle.matchNumber}>{Number.isFinite(Number(value))&&value!=null?value:'—'}</Text>
     </View>)}
    </View>
    <View style={cardStyle.bottomPlate}>
     <Text numberOfLines={1} adjustsFontSizeToFit style={cardStyle.category}>{String(team?.category||'VILLALBILLA C.F.').toUpperCase()}</Text>
     <Text style={cardStyle.season}>TEMPORADA 2026/27</Text>
    </View>
   </View>
  </Pressable>
  <Text style={{color:'#9ddfff',fontSize:11,textAlign:'center'}}>↻ Toca la carta para girarla · Valoraciones no oficiales</Text>
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

const cardStyle={
 frame:{alignSelf:'center',width:'100%',maxWidth:380,padding:4,borderRadius:24,backgroundColor:'#e91b46',borderWidth:2,borderColor:'#39c9ff',shadowColor:'#25baff',shadowOpacity:.7,shadowRadius:16,elevation:9,overflow:'hidden'},
 card:{width:'100%',borderRadius:19,overflow:'hidden',paddingHorizontal:9,paddingTop:12,paddingBottom:11,backgroundColor:'#081b43',borderWidth:2,borderColor:'#efbe5d'},
 top:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',height:105,zIndex:2},
 ratingPanel:{alignItems:'center',justifyContent:'center',width:94,borderColor:'#fa3b51',borderWidth:2,backgroundColor:'#430a25',borderRadius:12,paddingVertical:1},
 laurels:{fontSize:16,color:'#ffcf62',height:16},
 overall:{fontSize:47,color:'#ffdc56',fontWeight:'900',lineHeight:51,textShadowColor:'#b83a0a',textShadowRadius:6},
 role:{fontSize:23,color:'#fff',fontWeight:'900',lineHeight:25},
 striker:{fontSize:15},
 crestPanel:{alignItems:'center',width:120,gap:1},
 crest:{width:77,height:81},
 clubName:{fontSize:12,color:'#fff',fontWeight:'900',textAlign:'center'},
 portraitArea:{height:164,alignItems:'center',justifyContent:'flex-end',marginTop:-27,marginBottom:3,overflow:'hidden',borderBottomColor:'#26caff',borderBottomWidth:2},
 portraitGlow:{position:'absolute',height:116,width:'90%',bottom:-40,borderRadius:100,backgroundColor:'#145ca2',opacity:.65},
 portrait:{height:162,width:'90%'},
 backPanel:{height:164,alignItems:'center',justifyContent:'center',gap:2},
 backName:{color:'#ffce63',fontSize:20,fontWeight:'900'},
 nameBar:{flexDirection:'row',alignItems:'center',minHeight:61,marginHorizontal:-6,paddingLeft:13,borderRadius:13,borderWidth:2,borderColor:'#e67d41',backgroundColor:'#75102e'},
 playerName:{color:'#fff',fontSize:29,fontWeight:'900',textAlign:'center',flex:1,textShadowColor:'#08122d',textShadowRadius:5},
 numberBox:{minWidth:58,marginRight:2,padding:4,borderRadius:12,borderWidth:2,borderColor:'#ffb46b',backgroundColor:'#ba0d28',alignItems:'center'},
 numberText:{fontSize:42,lineHeight:47,color:'#fff',fontWeight:'900'},
 ratingsGrid:{flexDirection:'row',gap:5,marginTop:10},
 ratingColumn:{flex:1,gap:4},
 statLine:{minHeight:34,flexDirection:'row',alignItems:'center',paddingHorizontal:4,backgroundColor:'#10477e',borderWidth:1,borderColor:'#259ef7',borderRadius:7,gap:3},
 statIcon:{fontSize:13,width:17,color:'#fff',textAlign:'center'},
 statText:{color:'#fff',fontSize:11,fontWeight:'900',flex:1},
 statNumber:{color:'#ffdc52',fontSize:21,fontWeight:'900'},
 matchRow:{flexDirection:'row',gap:4,marginTop:10},
 matchBox:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',backgroundColor:'#510b2d',borderColor:'#fa416a',borderWidth:1,borderRadius:9,paddingVertical:5},
 matchLabel:{color:'#fff',fontSize:10,fontWeight:'900'},
 matchNumber:{color:'#ffde55',fontSize:25,fontWeight:'900'},
 bottomPlate:{marginTop:9,marginHorizontal:28,alignItems:'center',justifyContent:'center',padding:7,borderWidth:2,borderColor:'#ffc16a',backgroundColor:'#133968',borderRadius:12},
 category:{fontSize:19,color:'#fff',fontWeight:'900',textAlign:'center'},
 season:{fontSize:12,color:'#fff',fontWeight:'800',textAlign:'center'}
};
