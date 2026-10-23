import React from 'react';
import {View,Text,Image,StyleSheet} from 'react-native';
import {getPlayerPhoto} from './player-photos';
import seed from './players-seed.json';

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]+/g,' ').trim();
const photoIdFor=(name,teamId)=>{
  const wanted=normalize(name);
  if(!wanted)return null;
  const players=seed.teams.flatMap(team=>team.players.map(player=>({...player,teamId:player.teamId||team.id})));
  const exact=players.filter(player=>normalize(player.name)===wanted);
  return (exact.find(player=>String(player.teamId)===String(teamId))||exact[0])?.id||null;
};

export default function PlayerPortrait({playerId,name,teamId,size=48,style,photo,disableLookup=false}){
  const source=(photo?(typeof photo==='string'?{uri:photo}:photo):null)||getPlayerPhoto(playerId)||(!disableLookup?getPlayerPhoto(photoIdFor(name,teamId)):null);
  const initial=String(name||'?').trim().slice(0,1).toLocaleUpperCase('es')||'?';
  return <View style={[s.base,{width:size,height:size,borderRadius:size/2},style]}>
    {source?<Image source={source} accessibilityLabel={'Foto de '+(name||'jugador')} style={{width:size,height:size,borderRadius:size/2}} resizeMode="cover"/>:<Text style={[s.initial,{fontSize:Math.max(14,size*.4)}]}>{initial}</Text>}
  </View>;
}
const s=StyleSheet.create({base:{overflow:'hidden',backgroundColor:'#25364c',alignItems:'center',justifyContent:'center'},initial:{color:'#dce6ff',fontWeight:'800'}});
