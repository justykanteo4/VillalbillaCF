import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import TeamSelector from './TeamSelector';
import PlayerRanking from './PlayerRanking';
import ClubGoalkeeperRanking from './ClubGoalkeeperRanking';
import teams from './teams.json';
export default function PublicRankings({initialView='players'}){const [teamId,setTeamId]=useState(teams[0].id),[view,sv]=useState(initialView==='keepers'?'keepers':'players');return <View style={{gap:16}}><Text style={{color:'#fff',fontSize:28,fontWeight:'800'}}>Rankings del club</Text><View style={{flexDirection:'row',gap:8}}>{[['players','Jugadores'],['keepers','Porteros']].map(([id,label])=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:view===id}} onPress={()=>sv(id)} style={{flex:1,padding:15,borderRadius:12,backgroundColor:view===id?'#1b2e69':'#25364c',alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'800'}}>{label}</Text></Pressable>)}</View>{view==='keepers'?<ClubGoalkeeperRanking/>:<><TeamSelector label="Equipo del ranking" value={teamId} onChange={setTeamId} options={teams}/><PlayerRanking key={teamId} teamId={teamId} showMinutes={false}/></>}</View>}
