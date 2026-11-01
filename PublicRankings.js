import React,{useState} from 'react';
import {View,Text} from 'react-native';
import TeamSelector from './TeamSelector';
import PlayerRanking from './PlayerRanking';
import teams from './teams.json';
export default function PublicRankings(){const [teamId,setTeamId]=useState(teams[0].id);return <View style={{gap:16}}><Text style={{color:'#fff',fontSize:28,fontWeight:'800'}}>Rankings del club</Text><TeamSelector label="Equipo del ranking" value={teamId} onChange={setTeamId} options={teams}/><PlayerRanking key={teamId} teamId={teamId} showMinutes={false}/></View>}
