import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Pressable} from 'react-native';

// Feedback visual breve; nunca retrasa las acciones ni captura gestos de otros bloques.
export default function FantasyAnimatedPressable({children,onPress,disabled=false,style,contentStyle,...props}){
 const scale=useRef(new Animated.Value(1)).current;
 const tilt=useRef(new Animated.Value(0)).current;
 const animation=useRef(null);
 const [reduceMotion,setReduceMotion]=useState(false);
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
    ])
   ]);
  }
  animation.current.start();
 };
 return <Animated.View style={[{transform:[{scale},{rotate:tilt.interpolate({inputRange:[-1,0,1],outputRange:['-2deg','0deg','2deg']})}]},style]}>
  <Pressable {...props} disabled={disabled} onPressIn={()=>animate(true)} onPressOut={()=>animate(false)} onPress={onPress} style={[{minWidth:0,justifyContent:'center'},contentStyle]}>
   {children}
  </Pressable>
 </Animated.View>;
}
