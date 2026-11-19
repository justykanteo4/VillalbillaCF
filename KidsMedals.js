import React from 'react';
import {View,Text,Pressable} from 'react-native';
import medalPolicy from './kids-medals.cjs';
const {medalsFor,sanitizeStars}=medalPolicy;
export default function KidsMedals({stars=0,onBack}){
 const safe=sanitizeStars(stars),medals=medalsFor(safe),won=medals.filter(x=>x.unlocked).length,next=medals.find(x=>!x.unlocked);
 return <View style={{backgroundColor:'#172a4b',padding:18,gap:15,borderRadius:18,borderWidth:1,borderColor:'#5d7bb2'}}>
  <Text style={{fontSize:27,fontWeight:'900',color:'#fff'}}>🏅 Mis medallas</Text>
  <Text style={{color:'#e2eefa',fontSize:17}}>⭐ {safe} estrellas · {won} de {medals.length} medallas</Text>
  {next?<Text style={{color:'#ffda86',fontSize:13}}>Próxima: {next.title}. Te faltan {next.stars-safe} estrellas.</Text>:<Text style={{color:'#ffda86'}}>¡Has conseguido todas las medallas! 🎉</Text>}
  {medals.map(m=><View key={m.id} style={{flexDirection:'row',gap:12,alignItems:'center',padding:13,borderRadius:13,backgroundColor:m.unlocked?'#284878':'#1b2942',opacity:m.unlocked?1:0.65}}>
  <Text style={{fontSize:34}}>{m.unlocked?m.icon:'🔒'}</Text>
  <View style={{flex:1,gap:2}}><Text style={{color:'#fff',fontSize:16,fontWeight:'900'}}>{m.title}</Text><Text style={{color:'#bfd3e9',fontSize:12}}>{m.description}</Text><Text style={{color:'#ffda86',fontSize:11}}>{m.unlocked?'Conseguida ✓':m.stars+' estrellas necesarias'}</Text></View>
  </View>)}
  <Text style={{color:'#afc6e1',fontSize:12,lineHeight:18}}>Estas medallas se guardan en este dispositivo, no se publican ni se comparan con las de otros niños. No tienen valor económico.</Text>
  {onBack&&<Pressable accessibilityRole="button" onPress={onBack} style={{backgroundColor:'#b72135',padding:13,borderRadius:10}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'900'}}>Volver a jugar</Text></Pressable>}
 </View>;
}
