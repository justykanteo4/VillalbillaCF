import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Pressable,View} from 'react-native';
import theme from './fantasy-theme.cjs';

// Feedback visual breve; nunca retrasa las acciones ni captura gestos de otros bloques.
export default function FantasyAnimatedPressable({children,onPress,disabled=false,style,glow=true,...props}){
 const scale=useRef(new Animated.Value(1)).current;
 const tilt=useRef(new Animated.Value(0)).current;
 const spark=useRef(new Animated.Value(0)).current;
 const animation=useRef(null);
 const [reduceMotion,setReduceMotion]=useState(true);
 useEffect(()=>{
  let active=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduceMotion(!!value)}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener?.('reduceMotionChanged',setReduceMotion);
  return()=>{active=false;subscription?.remove?.();animation.current?.stop?.()};
 },[]);
 const animate=(pressed=false)=>{
  if(reduceMotion||disabled)return;
  animation.current?.stop?.();
  if(pressed){
   animation.current=Animated.parallel([
    Animated.spring(scale,{toValue:0.955,speed:26,bounciness:3,useNativeDriver:true}),
    Animated.timing(tilt,{toValue:-1,duration:100,useNativeDriver:true}),
   ]);
  }else{
   animation.current=Animated.parallel([
    Animated.sequence([
     Animated.spring(scale,{toValue:1.075,speed:17,bounciness:13,useNativeDriver:true}),
     Animated.spring(scale,{toValue:1,speed:18,bounciness:7,useNativeDriver:true}),
    ]),
    Animated.sequence([
     Animated.timing(tilt,{toValue:1,duration:120,easing:Easing.out(Easing.quad),useNativeDriver:true}),
     Animated.spring(tilt,{toValue:0,speed:18,bounciness:8,useNativeDriver:true}),
    ]),
    Animated.sequence([
     Animated.timing(spark,{toValue:1,duration:140,useNativeDriver:true}),
     Animated.timing(spark,{toValue:0,duration:310,useNativeDriver:true}),
    ]),
   ]);
  }
  animation.current.start();
 };
 return <Animated.View style={[{transform:[{scale},{rotate:tilt.interpolate({inputRange:[-1,0,1],outputRange:['-2deg','0deg','2deg']})}]},style]}>
  <Pressable {...props} disabled={disabled} onPressIn={()=>animate(true)} onPressOut={()=>animate(false)} onPress={onPress} style={{flex:1}}>
   {children}
   {!reduceMotion&&glow&&<Animated.View pointerEvents="none" accessible={false} style={{position:'absolute',top:0,right:0,left:0,bottom:0,borderRadius:12,borderColor:theme.accent,borderWidth:1,opacity:spark,shadowColor:theme.accent,shadowOpacity:0.8,shadowRadius:12}}/>}
   {!reduceMotion&&glow&&<Animated.Text pointerEvents="none" accessible={false} style={{position:'absolute',right:6,top:-6,color:theme.accent,fontSize:16,opacity:spark,transform:[{scale:spark.interpolate({inputRange:[0,1],outputRange:[0.4,1.2]})}]}}>✦</Animated.Text>}
  </Pressable>
 </Animated.View>;
}
