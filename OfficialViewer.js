import {SectionStack} from './AppDividers';
import appTheme from './app-theme';
import React from 'react';
import {View,Text,Pressable,Linking} from 'react-native';
export default function OfficialViewer({url,onClose}){return <SectionStack style={{padding:24,gap:20}}><Pressable onPress={onClose}><Text style={{color:"#dce6f2"}}>← Volver al club</Text></Pressable><Text style={{color:"#dce6f2"}}>Primera Aficionado · Grupo 4 · 2026/27</Text><Text style={{color:"#dce6f2"}}>En la vista web, consulta la RFFM en una pestaña del navegador. La app móvil incluye un visor integrado.</Text><Pressable onPress={()=>Linking.openURL(url).catch(()=>{})}><Text style={{color:appTheme.accent}}>Abrir la web oficial ↗</Text></Pressable></SectionStack>}
