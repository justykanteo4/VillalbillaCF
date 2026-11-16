import React,{useEffect,useReducer,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,Image,Keyboard,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import FantasyRevealCard from './FantasyRevealCard';
import {useFantasyOfferVisible} from './fantasy-offer-visibility';
import {useFantasyRevealSlot} from './fantasy-reveal-queue';
import {packState,packStep} from './fantasy-pack-policy.cjs';
import {Button,ErrorText,theme} from './FantasyUI';
const pack=require('./assets/fantasy/pack-2027.webp'),stadium=require('./assets/fantasy/reveal-stadium.webp');
export default function FantasyPackReveal({players=[],mode='squad',leagueName='',paid,auction=false,onFinish,onLater,busy=false,error=''}){
 const snapshot=useRef([...new Map(players.filter(p=>p?.id||p?.playerId).map(p=>[String(p.id||p.playerId),p])).values()]).current;
 const [state,step]=useReducer(packStep,snapshot.length,packState),[reduced,setReduced]=useState(false),[foreground,setForeground]=useState(AppState.currentState!=='background'),progress=useRef(new Animated.Value(0)).current;
 const offerVisible=useFantasyOfferVisible(),slot=useFantasyRevealSlot(true,mode==='squad'?20:10),visible=slot&&!offerVisible,insets=useSafeAreaInsets(),{width,height}=useWindowDimensions();
 const p=snapshot[state.index],opened=state.phase==='revealed',opening=state.phase==='opening',compact=height<740,w=Math.min(width-44,height*.43,320),h=w*1.5,cap=h*.12,cardWidth=Math.min(width-42,height*.44,350);
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));return()=>sub.remove()},[]);
 useEffect(()=>{if(visible)Keyboard.dismiss()},[visible]);
 useEffect(()=>{let active=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(active)setReduced(v)}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{active=false;sub.remove()}},[]);
 useEffect(()=>{
  if(state.phase==='sealed')progress.setValue(0);
  if(!visible||!foreground||state.phase!=='opening')return;
  const duration=reduced?320:1250;
  let active=true;
  const finish=()=>{
   if(!active)return;
   active=false;
   clearTimeout(deadline);
   progress.setValue(1);
   step('revealed');
  };
  const deadline=setTimeout(finish,duration+200);
  const animation=Animated.timing(progress,{toValue:1,duration,easing:Easing.linear,useNativeDriver:Platform.OS!=='web',isInteraction:false});
  animation.start(({finished})=>{if(finished)finish()});
  return()=>{active=false;clearTimeout(deadline);animation.stop()};
 },[state.phase,state.index,visible,reduced,foreground,progress]);
 const close=()=>{if(!busy)(onLater||onFinish)?.()},reveal=()=>{if(!busy)step('open')},next=()=>{if(busy||!opened)return;if(state.index+1===state.count)onFinish?.();else{progress.setValue(0);step('next')}};
 return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}><View accessibilityViewIsModal style={s.screen}><StatusBar hidden/><Image source={stadium} resizeMode="cover" style={StyleSheet.absoluteFillObject}/><View pointerEvents="none" style={[StyleSheet.absoluteFillObject,{backgroundColor:'#03061055'}]}/>
 <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,justifyContent:'center',alignItems:'center',paddingHorizontal:20,paddingTop:Math.max(insets.top,16),paddingBottom:Math.max(insets.bottom,16),gap:compact?8:14}}><View style={{alignItems:'center',gap:5,maxWidth:460}}><Text style={s.brand}>VILLALBILLA<Text style={{color:theme.accent}}>FANTASY</Text></Text><Text accessibilityRole="header" style={[s.heading,{fontSize:compact?23:28}]}>{mode==='squad'?'Tu equipo empieza aquí':opened?'¡Nuevo fichaje!':'Tu nuevo fichaje'}</Text>{!!leagueName&&<Text style={s.subtitle}>{leagueName}</Text>}<Text style={s.counter}>{mode==='squad'?'PLANTILLA INICIAL · '+(state.index+1)+' / '+state.count:'FICHAJE CONFIRMADO'}</Text></View>
 <View style={{width:'100%',maxWidth:400,minHeight:h+12,alignItems:'center',justifyContent:'center'}}>
 {state.phase!=='sealed'&&p&&<FantasyRevealCard player={p} progress={progress} opened={opened} reduced={reduced} width={cardWidth} paid={paid} auction={auction} showPrice={mode==='purchase'}/>}
 {!opened&&<Animated.View style={{position:state.phase==='sealed'?'relative':'absolute',width:w,height:h,opacity:reduced?progress.interpolate({inputRange:[0,.5,1],outputRange:[1,0,0]}):1}}><Pressable accessibilityRole="button" accessibilityLabel="Toca el sobre para abrirlo" accessibilityState={{disabled:opening||busy}} disabled={opening||busy} onPress={reveal} style={{width:w,height:h}}><Animated.View style={{position:'absolute',top:0,left:0,width:w,height:cap,overflow:'hidden',opacity:progress.interpolate({inputRange:[0,.24,.57,1],outputRange:[1,1,0,0]}),transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[0,reduced?0:95]})},{translateY:progress.interpolate({inputRange:[0,1],outputRange:[0,reduced?0:-120]})},{rotate:progress.interpolate({inputRange:[0,1],outputRange:['0deg',reduced?'0deg':'32deg']})}]}}><Image source={pack} style={{width:w,height:h}} resizeMode="stretch"/></Animated.View><Animated.View style={{position:'absolute',top:cap,left:0,width:w,height:h-cap,overflow:'hidden',opacity:progress.interpolate({inputRange:[0,.45,.85,1],outputRange:[1,1,0,0]}),transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[0,reduced?0:110]})},{scale:progress.interpolate({inputRange:[0,1],outputRange:[1,reduced?1:.9]})}]}}><Image source={pack} style={{width:w,height:h,marginTop:-cap}} resizeMode="stretch"/></Animated.View></Pressable></Animated.View>}
 </View>
 <View style={{width:'100%',maxWidth:380,gap:10}}><ErrorText>{error}</ErrorText>{!p?<Button disabled={busy} onPress={onFinish}>Entrar a mi plantilla</Button>:opened?<Button disabled={busy} onPress={next}>{busy?'Guardando…':state.index+1<state.count?'Siguiente sobre':'Ver en mi plantilla'}</Button>:<Button disabled={opening||busy} onPress={reveal}>{opening?'Abriendo sobre…':'Toca el sobre para abrirlo'}</Button>}<Pressable accessibilityRole="button" disabled={busy} onPress={close} style={{minHeight:40,justifyContent:'center',alignItems:'center'}}><Text style={{color:'#DBD5C8',fontSize:13}}>{mode==='squad'?'Ir a mi plantilla sin abrir todos':'Ver más tarde'}</Text></Pressable></View></ScrollView>
 </View></Modal>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#030610'},brand:{color:'#F5F1E8',fontSize:18,fontWeight:'900',letterSpacing:.3},heading:{color:'#F8D889',fontWeight:'900',textAlign:'center'},subtitle:{color:'#CFD5E0',fontSize:13,textAlign:'center'},counter:{color:'#E8BE65',fontSize:11,fontWeight:'900',letterSpacing:2,marginTop:4}});
