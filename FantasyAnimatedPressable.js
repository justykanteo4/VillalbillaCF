import React from 'react';
import {Pressable,View} from 'react-native';

// Conserva la API y el estilo de los bloques sin animaciones de pulsación.
export default function FantasyAnimatedPressable({children,onPress,disabled=false,style,contentStyle,...props}){
 return <View style={style}>
  <Pressable {...props} disabled={disabled} onPress={onPress} style={[{minWidth:0,justifyContent:'center'},contentStyle]}>
   {children}
  </Pressable>
 </View>;
}
