import React from 'react';
import {Image,Pressable} from 'react-native';

// El texto, los detalles y los efectos están incluidos en el PNG original.
export default function FantasyNewsAccess({onPress}){
 return <Pressable
  accessibilityRole="button"
  accessibilityLabel="Abrir VillalbillaFantasy desde Noticias"
  onPress={onPress}
  style={{width:'100%',borderRadius:18,overflow:'hidden'}}
 >
  <Image
   source={require('./assets/news-fantasy-banner.png')}
   accessibilityLabel="Banner Fantasy con copa, balón y fondo rojo y azul celeste"
   resizeMode="contain"
   style={{width:'100%',aspectRatio:3}}
  />
 </Pressable>;
}
