import React,{useState} from 'react';
import {View,Text,Pressable,StyleSheet} from 'react-native';
import Standings from './Standings';
import NextMatch from './NextMatch';
import Sanctions from './Sanctions';
export default function Competition({initialTeamId='680163'}){const [section,setSection]=useState('Resumen');return <View style={{gap:16}}><View style={s.tabs}>{['Resumen','Sanciones'].map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:section===value}} onPress={()=>setSection(value)} style={[s.tab,section===value&&s.active]}><Text style={s.tabText}>{value==='Sanciones'?'🟥 ': '🏆 '}{value}</Text></Pressable>)}</View>{section==='Sanciones'?<Sanctions key={initialTeamId} teamId={initialTeamId}/>:<><Standings key={initialTeamId} initialTeamId={initialTeamId} lockedTeamId={initialTeamId}/><NextMatch key={'next-'+initialTeamId} teamId={initialTeamId} showFollowing={false} showWeather/></>}</View>}
const s=StyleSheet.create({tabs:{flexDirection:'row',gap:8},tab:{flex:1,paddingVertical:12,borderRadius:12,backgroundColor:'#172435',alignItems:'center',borderWidth:1,borderColor:'#2d3e52'},active:{backgroundColor:'#1b2e69',borderColor:'#536fc4'},tabText:{color:'#e5ebf4',fontWeight:'800',fontSize:13}});
