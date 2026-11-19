import React from 'react';
import {View,Text} from 'react-native';

// Fondo decorativo sin imágenes externas, compartido por los dos banners.
export default function NewsFeatureBackdrop({variant='fantasy'}){
 const card=variant==='card';
 return <View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0,overflow:'hidden',backgroundColor:'#091a37'}}>
   <View style={{position:'absolute',left:-105,top:-80,width:'76%',height:'185%',backgroundColor:card?'#a41639':'#b61532',transform:[{rotate:'-22deg'}],opacity:.96}}/>
   <View style={{position:'absolute',right:-100,top:-75,width:'76%',height:'190%',backgroundColor:card?'#1556a7':'#115dae',transform:[{rotate:'22deg'}],opacity:.88}}/>
   <View style={{position:'absolute',left:'31%',top:-80,width:'33%',height:'180%',backgroundColor:'#0a1740',opacity:.72,transform:[{rotate:'-28deg'}]}}/>
   {[
    {left:'-8%',top:'23%',width:'87%',rotate:'-20deg',color:'#ff6079'},
    {left:'22%',top:'62%',width:'85%',rotate:'-20deg',color:'#48b6ff'},
    {left:'6%',top:'78%',width:'74%',rotate:'-20deg',color:'#fa6276'},
    {left:'41%',top:'17%',width:'72%',rotate:'-20deg',color:'#83e0ff'},
   ].map((line,i)=><View key={i} style={{position:'absolute',left:line.left,top:line.top,width:line.width,height:i===0?3:2,backgroundColor:line.color,opacity:i===0?.85:.65,transform:[{rotate:line.rotate}],shadowColor:line.color,shadowOpacity:1,shadowRadius:9,elevation:5}}/>)}
   <View style={{position:'absolute',bottom:0,right:0,width:'58%',height:'40%',backgroundColor:'#1c67a9',opacity:.2,borderTopLeftRadius:130}}/>
   <View style={{position:'absolute',top:10,right:12}}><Text style={{color:'#ccedff',opacity:.37,fontSize:14}}>✦</Text></View>
   <View style={{position:'absolute',bottom:12,left:13}}><Text style={{color:'#ffcc9e',opacity:.73,fontSize:16}}>✦</Text></View>
 </View>;
}
