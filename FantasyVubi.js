import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Pressable,Text,View,useWindowDimensions} from 'react-native';
import theme from './fantasy-theme.cjs';
import {vubiFootballSprite,VUBI_FRAME_WIDTH,VUBI_FRAME_HEIGHT} from './FantasyVubiAsset';

// Vubi juega con el balón al abrir Fantasy. El botón permite repetir la animación.
export default function FantasyVubi(){
 const {width}=useWindowDimensions();
 const progress=useRef(new Animated.Value(-110)).current;
 const current=useRef(null);
 const [frame,setFrame]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [reduceMotion,setReduceMotion]=useState(false);
 const [replay,setReplay]=useState(0);
 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(!!value)}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener?.('reduceMotionChanged',setReduceMotion);
  return()=>{mounted=false;sub?.remove?.()};
 },[]);
 useEffect(()=>{
  if(reduceMotion){setPlaying(false);progress.stopAnimation();return}
  let alive=true;
  setPlaying(true);
  progress.setValue(-110);
  const frameTimer=setInterval(()=>{if(alive)setFrame(x=>(x+1)%3)},240);
  const animation=Animated.sequence([
   Animated.delay(400),
   Animated.timing(progress,{toValue:Math.max(width,250),duration:5600,easing:Easing.linear,useNativeDriver:true}),
  ]);
  current.current=animation;
  animation.start(()=>{if(alive)setPlaying(false)});
  return()=>{alive=false;clearInterval(frameTimer);animation.stop()};
 },[replay,width,reduceMotion,progress]);
 const startAgain=()=>setReplay(n=>n+1);
 return <View style={{height:36,backgroundColor:theme.background,justifyContent:'center',alignItems:'flex-end',paddingRight:12,zIndex:11,overflow:'visible'}}>
  <Pressable accessibilityRole="button" accessibilityLabel="Ver a Vubi jugando con el balón" onPress={startAgain} style={{borderWidth:1,borderColor:theme.accent,borderRadius:16,paddingVertical:5,paddingHorizontal:12,backgroundColor:theme.panel}}>
   <Text style={{color:theme.accent,fontWeight:'900',fontSize:12}}>⚽ VUBI ✦</Text>
  </Pressable>
  {playing&&!reduceMotion&&<Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',top:35,left:0,width:VUBI_FRAME_WIDTH,height:VUBI_FRAME_HEIGHT,overflow:'hidden',transform:[{translateX:progress}],zIndex:12}}>
    <Image source={{uri:vubiFootballSprite}} resizeMode="stretch" style={{position:'absolute',top:0,left:-frame*VUBI_FRAME_WIDTH,width:VUBI_FRAME_WIDTH*3,height:VUBI_FRAME_HEIGHT}}/>
   </Animated.View>}
 </View>;
}
