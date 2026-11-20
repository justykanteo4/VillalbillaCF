import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Pressable,Text,View,useWindowDimensions} from 'react-native';
import theme from './fantasy-theme.cjs';
import {vubiFootballSprite,VUBI_FRAME_WIDTH,VUBI_FRAME_HEIGHT} from './FantasyVubiAsset';

// Las animaciones son decorativas, no interceptan clics ni impiden navegar.
function useReducedMotion(){
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{
  let live=true;
  AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(live)setReduced(Boolean(v))}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener?.('reduceMotionChanged',setReduced);
  return()=>{live=false;sub?.remove?.()};
 },[]);
 return reduced;
}
function VubiHead({frame=0,size=72}){
 const scale=size/VUBI_FRAME_WIDTH;
 return <View pointerEvents="none" style={{width:size,height:VUBI_FRAME_HEIGHT*scale,overflow:'hidden'}}>
  <Image source={{uri:vubiFootballSprite}} resizeMode="stretch" style={{position:'absolute',width:VUBI_FRAME_WIDTH*3*scale,height:VUBI_FRAME_HEIGHT*scale,left:-frame*size,top:0}}/>
 </View>;
}

// La cabecera es el escenario: Vubi cruza con el balón y se oculta tras los controles.
export default function FantasyVubi(){
 const {width}=useWindowDimensions();
 const reduced=useReducedMotion();
 const travel=useRef(new Animated.Value(-110)).current;
 const ball=useRef(new Animated.Value(0)).current;
 const [frame,setFrame]=useState(0);
 const [active,setActive]=useState(false);
 const [replay,setReplay]=useState(0);
 useEffect(()=>{
  if(reduced){setActive(false);return}
  let live=true;
  setActive(true);
  travel.setValue(-110);ball.setValue(0);
  const frames=setInterval(()=>{if(live)setFrame(v=>(v+1)%3)},260);
  const bounce=Animated.loop(Animated.sequence([
   Animated.timing(ball,{toValue:-12,duration:300,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   Animated.timing(ball,{toValue:0,duration:300,easing:Easing.in(Easing.quad),useNativeDriver:true})
  ]));
  const move=Animated.sequence([Animated.delay(600),Animated.timing(travel,{toValue:Math.max(width,300),duration:6000,easing:Easing.linear,useNativeDriver:true})]);
  bounce.start();
  move.start(({finished})=>{if(live&&finished)setActive(false)});
  return()=>{live=false;clearInterval(frames);bounce.stop();move.stop()};
 },[replay,width,reduced,travel,ball]);
 return <View style={{height:82,backgroundColor:theme.header,overflow:'hidden',position:'relative',borderTopWidth:1,borderTopColor:theme.border}}>
  <View pointerEvents="none" style={{position:'absolute',left:8,right:8,bottom:3,height:1,backgroundColor:theme.accent,opacity:.55}}/>
  {active&&<Animated.View pointerEvents="none" style={{position:'absolute',left:0,bottom:-15,width:120,height:98,flexDirection:'row',alignItems:'flex-end',transform:[{translateX:travel}]}}>
   <VubiHead frame={frame} size={79}/>
   <Animated.Text style={{fontSize:29,marginLeft:-3,marginBottom:11,transform:[{translateY:ball}]}}>⚽</Animated.Text>
  </Animated.View>}
  <View pointerEvents="none" style={{position:'absolute',top:5,left:10}}><Text style={{color:theme.accent,fontWeight:'800',fontSize:11}}>✦ VUBI</Text></View>
  <Pressable accessibilityRole="button" accessibilityLabel="Repetir animación de Vubi con el balón" onPress={()=>setReplay(x=>x+1)} style={{position:'absolute',right:10,top:13,minHeight:35,paddingHorizontal:12,justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:theme.accent,backgroundColor:theme.panel,zIndex:3}}>
   <Text style={{fontSize:12,color:theme.accent,fontWeight:'900'}}>⚽ VUBI</Text>
  </Pressable>
 </View>;
}

// Asoma la cabeza lateralmente y saluda cada cierto tiempo, sin tapar controles.
export function FantasyVubiPeek(){
 const reduced=useReducedMotion();
 const slide=useRef(new Animated.Value(100)).current;
 const wave=useRef(new Animated.Value(0)).current;
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  if(reduced){setVisible(false);return}
  let alive=true;let first=setTimeout(show,23000);
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
  const repeat=setInterval(show,45000);
  return()=>{alive=false;clearTimeout(first);clearInterval(repeat);slide.stopAnimation();wave.stopAnimation()};
 },[reduced,slide,wave]);
 if(!visible)return null;
 return <Animated.View pointerEvents="none" accessible={false} style={{position:'absolute',right:0,top:150,zIndex:20,width:100,height:105,overflow:'hidden',transform:[{translateX:slide}]}}>
   <VubiHead frame={1} size={85}/>
   <Animated.Text style={{position:'absolute',right:2,top:42,fontSize:25,opacity:wave}}>👋</Animated.Text>
  </Animated.View>;
}
