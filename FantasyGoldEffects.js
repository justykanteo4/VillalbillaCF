import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,View} from 'react-native';
import theme from './fantasy-theme.cjs';

// Efectos puramente decorativos: no interceptan pulsaciones ni bloquean el scroll.
export default function FantasyGoldEffects(){
 const shimmer=useRef(new Animated.Value(0)).current;
 const twinkle=useRef(new Animated.Value(0)).current;
 const [reducedMotion,setReducedMotion]=useState(true);
 useEffect(()=>{
  let active=true;
  AccessibilityInfo.isReduceMotionEnabled().then(reduce=>{if(active)setReducedMotion(reduce)}).catch(()=>{});
  const listener=AccessibilityInfo.addEventListener?.('reduceMotionChanged',setReducedMotion);
  return()=>{active=false;listener?.remove?.()};
 },[]);
 useEffect(()=>{
  if(reducedMotion)return;
  const sweep=Animated.loop(Animated.sequence([
   Animated.timing(shimmer,{toValue:1,duration:2400,easing:Easing.inOut(Easing.cubic),useNativeDriver:true}),
   Animated.delay(2200),
   Animated.timing(shimmer,{toValue:0,duration:0,useNativeDriver:true}),
  ]));
  const stars=Animated.loop(Animated.sequence([
   Animated.timing(twinkle,{toValue:1,duration:850,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(twinkle,{toValue:0,duration:1150,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.delay(900),
  ]));
  sweep.start();stars.start();
  return()=>{sweep.stop();stars.stop()};
 },[reducedMotion,shimmer,twinkle]);
 if(reducedMotion)return null;
 const shift=shimmer.interpolate({inputRange:[0,1],outputRange:[-120,450]});
 const opacity=shimmer.interpolate({inputRange:[0,0.12,0.8,1],outputRange:[0,0.8,0.8,0]});
 return <View pointerEvents="none" accessible={false} style={{position:'absolute',top:0,left:0,right:0,height:84,overflow:'hidden',zIndex:10}}>
   <View style={{position:'absolute',top:3,left:0,right:0,height:1,backgroundColor:theme.accent,opacity:0.28}}/>
   <Animated.View style={{position:'absolute',top:0,left:0,width:80,height:3,backgroundColor:theme.accent,opacity,transform:[{translateX:shift},{skewX:'-28deg'}],shadowColor:theme.accent,shadowOpacity:0.8,shadowRadius:10,elevation:1}}/>
   <Animated.Text style={{position:'absolute',right:24,top:8,color:theme.accent,fontSize:16,opacity:twinkle,transform:[{scale:twinkle.interpolate({inputRange:[0,1],outputRange:[0.6,1.15]})}]}}>✦</Animated.Text>
   <Animated.Text style={{position:'absolute',left:35,top:28,color:theme.accent,fontSize:11,opacity:twinkle.interpolate({inputRange:[0,1],outputRange:[0.65,0]})}}>✧</Animated.Text>
  </View>;
}
