import React from 'react';
import {Image} from 'react-native';
export default function FantasyIcon({size=72}){return <Image source={require('./assets/villalbilla-fantasy-icon.png')} accessibilityLabel="Icono de VillalbillaFantasy" resizeMode="contain" style={{width:size,height:size,borderRadius:Math.round(size*.16)}}/>}
