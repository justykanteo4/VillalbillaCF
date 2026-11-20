import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Pressable,Text,View,useWindowDimensions} from 'react-native';
import theme from './fantasy-theme.cjs';
import {vubiFootballSprite,VUBI_FRAME_WIDTH,VUBI_FRAME_HEIGHT} from './FantasyVubiAsset';

function useReducedMotion(){
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{
  let live=true;
  AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)setReduced(Boolean(v))}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener?.('reduceMotionChanged',v=>setReduced(Boolean(v)));
  return()=>{live=false;sub?.remove?.()};
 },[]);
 return reduced;
}

// Keep a visible mascot even if the embedded sprite is unsupported by the device.
// The football emoji is a separate visual element, never the only mascot.
function VubiHead({frame=0,size=72}){
 const [loaded,setLoaded]=useState(false);
 const [failed,setFailed]=useState(false);
 const height=VUBI_FRAME_HEIGHT*size/VUBI_FRAME_WIDTH;
 return <View pointerEvents="none" style={{width:size,height,overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
  {!loaded&&<Text accessibilityLabel="Vubi, mascota de Villalbilla Fantasy" style={{fontSize:size*.68,lineHeight:height*.92}}>🦔</Text>}
  {!failed&&<Image
   source={{uri:vubiFootballSprite}}
   resizeMode="stretch"
   onLoad={()=>setLoaded(true)}
   onError={()=>{setFailed(true);setLoaded(false)}}
   style={{position:'absolute',width:VUBI_FRAME_WIDTH*3*size/VUBI_FRAME_WIDTH,height,left:-frame*size,top:0,opacity:loaded?1:0}}
  />}
 </View>;
}

// Vubi stays in the header, occasionally runs across it and plays with the ball.
// All animated surfaces ignore touches so header controls remain usable.
export default function FantasyVubi(){
 const {width}=useWindowDimensions();
 const reduced=useReducedMotion();
 const travel=useRef(new Animated.Value(0)).current;
 const ball=useRef(new Animated.Value(0)).current;
 const [frame,setFrame]=useState(0);
 const [replay,setReplay]=useState(0);
 useEffect(()=>{
  travel.stopAnimation();ball.stopAnimation();travel.setValue(0);ball.setValue(0);
  if(reduced)return;
  let live=true;
  const frames=setInterval(()=>{if(live)setFrame(v=>(v+1)%3)},260);
  const bounce=Animated.loop(Animated.sequence([
   Animated.timing(ball,{toValue:-10,duration:300,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(ball,{toValue:0,duration:300,easing:Easing.in(Easing.quad),useNativeDriver:true}),
   Animated.delay(500)
  ]));
  const distance=Math.max(0,width-140);
  const movement=Animated.loop(Animated.sequence([
   Animated.delay(2500),
   Animated.timing(travel,{toValue:distance,duration:5500,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.delay(1700),
   Animated.timing(travel,{toValue:0,duration:5500,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.delay(9500)
  ]));
  bounce.start();movement.start();
  return()=>{live=false;clearInterval(frames);bounce.stop();movement.stop()};
 },[replay,width,reduced,travel,ball]);
 return <View style={{height:110,backgroundColor:theme.header,overflow:'hidden',position:'relative',borderTopWidth:1,borderTopColor:theme.border}}>
  <View pointerEvents="none" style={{position:'absolute',left:8,right:8,bottom:3,height:1,backgroundColor:theme.accent,opacity:.55}}/>
  <Animated.View pointerEvents="none" style={{position:'absolute',left:6,bottom:3,width:115,height:101,flexDirection:'row',alignItems:'flex-end',transform:[{translateX:travel}]}}>
   <VubiHead frame={reduced?0:frame} size={77}/>
   <Animated.Text style={{fontSize:28,marginLeft:-1,marginBottom:9,transform:[{translateY:ball}]}}>⚽</Animated.Text>
  </Animated.View>
  <View pointerEvents="none" style={{position:'absolute',top:5,left:10}}><Text style={{color:theme.accent,fontWeight:'800',fontSize:11}}>✦ VUBI</Text></View>
  <Pressable accessibilityRole="button" accessibilityLabel="Repetir animación de Vubi con el balón" onPress={()=>setReplay(x=>x+1)} style={{position:'absolute',right:10,top:9,minHeight:31,paddingHorizontal:11,justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:theme.accent,backgroundColor:theme.panel,zIndex:3}}>
   <Text style={{fontSize:12,color:theme.accent,fontWeight:'900'}}>⚽ VUBI</Text>
  </Pressable>
 </View>;
}

// Brief greeting on the content edge, never blocks screen interaction.
export function FantasyVubiPeek(){
 const reduced=useReducedMotion();
 const slide=useRef(new Animated.Value(100)).current;
 const wave=useRef(new Animated.Value(0)).current;
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  if(reduced){setVisible(false);return}
  let alive=true;
  function show(){
   if(!alive)return;
   setVisible(true);slide.setValue(100);wave.setValue(0);
   Animated.sequence([
    Animated.timing(slide,{toValue:0,duration:650,useNativeDriver:true}),
    Animated.delay(1800),
    Animated.timing(slide,{toValue:100,duration:650,useNativeDriver:true})
   ]).start(()=>{if(alive)setVisible(false)});
   Animated.sequence([Animated.delay(600),Animated.timing(wave,{toValue:1,duration:400,useNativeDriver:true})]).start();
  }
  const first=setTimeout(show,23000);
  const repeat=setInterval(show,45000);
  return()=>{alive=false;clearTimeout(first);clearInterval(repeat);slide.stopAnimation();wave.stopAnimation()};
 },[reduced,slide,wave]);
 if(!visible)return null;
 return <Animated.View pointerEvents="none" accessible={false} style={{position:'absolute',right:0,top:150,zIndex:20,width:100,height:112,overflow:'hidden',transform:[{translateX:slide}]}}>
  <VubiHead frame={1} size={85}/>
  <Animated.Text style={{position:'absolute',right:2,top:42,fontSize:25,opacity:wave}}>👋</Animated.Text>
 </Animated.View>;
}
