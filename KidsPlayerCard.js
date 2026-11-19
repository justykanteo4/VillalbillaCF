import React from 'react';
import {View,Text,Image} from 'react-native';
export default function KidsPlayerCard(){
 return <View style={{gap:15,alignItems:'center'}}>
 <View style={{width:'100%',maxWidth:340,borderRadius:28,padding:5,backgroundColor:'#e5bf50'}}>
 <View style={{padding:19,backgroundColor:'#102857',borderRadius:24,borderWidth:2,borderColor:'#5fbdf6',alignItems:'center',gap:12}}>
 <View style={{width:'100%',flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:'#ffe18a',fontSize:19,fontWeight:'900'}}>VILLALBILLA KIDS</Text><Text style={{color:'#fff',fontSize:22}}>⚽</Text></View>
 <View style={{width:140,height:150,borderRadius:20,backgroundColor:'#233e74',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#6eb9ef'}}><Text style={{fontSize:60}}>👤</Text><Text style={{color:'#dce6ff',fontSize:11}}>TU FOTO</Text></View>
 <Image source={require('./assets/escudo-transparente.png')} style={{width:46,height:61}} resizeMode="contain"/>
 <Text style={{color:'#fff',fontSize:24,fontWeight:'900'}}>TU CARTA</Text><Text style={{color:'#87dfff',fontSize:13,fontWeight:'800'}}>VILLALBILLA C.F.</Text>
 <View style={{width:'100%',flexDirection:'row',justifyContent:'space-around'}}>{[['⭐','ESFUERZO'],['🤝','EQUIPO'],['🎮','DIVERSIÓN']].map(([symbol,label])=><View key={label} style={{alignItems:'center',gap:4}}><Text style={{fontSize:25}}>{symbol}</Text><Text style={{fontSize:10,color:'#dce6ff',fontWeight:'800'}}>{label}</Text></View>)}</View>
 </View></View>
 <Text style={{color:'#ffd46a',fontSize:15,fontWeight:'900'}}>🚧 FOTO PERSONALIZADA EN CONSTRUCCIÓN</Text>
 <Text style={{color:'#c1d3e7',fontSize:13,lineHeight:21,textAlign:'center'}}>Este es el diseño de muestra. No se suben ni publican fotos de menores. El futuro perfil personal necesitará autorización del padre, madre o tutor y controles de privacidad.</Text>
 </View>
}
