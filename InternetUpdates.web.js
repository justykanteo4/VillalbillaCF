import React from 'react';
import {Pressable,Text} from 'react-native';
export default function InternetUpdates(){return null}
export function UpdateStatus(){return null}

export function ManualUpdate(){return <Pressable accessibilityRole="button" onPress={()=>globalThis.location?.reload()}><Text style={{color:'#91adff'}}>Actualizar aplicación web</Text></Pressable>}
