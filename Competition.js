import React,{useState} from 'react';
import {View} from 'react-native';
import Standings from './Standings';
import NextMatch from './NextMatch';
export default function Competition({initialTeamId='680163'}){const [id,select]=useState(initialTeamId);return <View style={{gap:20}}><Standings initialTeamId={initialTeamId} onTeamChange={select}/><NextMatch key={id} teamId={id} showFollowing={false} showWeather/></View>}
