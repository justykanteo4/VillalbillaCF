import React from 'react';
import {Image,Pressable,StyleSheet} from 'react-native';

const banner=require('./assets/news-fantasy-banner.png');

// El banner se adapta a la anchura disponible, sin provocar desplazamiento horizontal.
export default function FantasyNewsAccess({onPress}){
 return <Pressable
  accessibilityRole="button"
  accessibilityLabel="Abrir VillalbillaFantasy desde Noticias"
  onPress={onPress}
  style={styles.banner}
 >
  <Image
   source={banner}
   accessibilityLabel="Banner Fantasy con copa, balón y fondo rojo y azul celeste"
   resizeMode="contain"
   style={styles.image}
  />
 </Pressable>;
}
const styles=StyleSheet.create({
 banner:{width:'100%',aspectRatio:2.5,borderRadius:16,overflow:'hidden',backgroundColor:'#0b1429',margin:0,padding:0},
 image:{width:'100%',height:'100%'}
});
