import React from 'react';
import {View,Text} from 'react-native';
import PlayerPortrait from './PlayerPortrait';
import seed from './players-seed.json';

export default function TeamPlayerIdentity({player,teamId,details={}}){
 const official=seed.teams.find(t=>String(t.id)===String(teamId))?.players.find(p=>String(p.id)===String(player.federationId||player.id));
 const detail=details[player.federationId||player.id]||details[player.id]||{};
 return <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
  <PlayerPortrait playerId={player.federationId||player.id} name={player.name} teamId={teamId} size={56}/>
  <Text accessibilityLabel={'Dorsal '+(official?.number??player.number??'no disponible')} style={{color:'#eaf0fa',padding:10,borderRadius:10,backgroundColor:'#1b2e69',fontSize:23,fontWeight:'900'}}>{official?.number??player.number??'—'}</Text>
  <View style={{flex:1}}><Text style={{color:'#eaf0fa',fontSize:15,lineHeight:23,fontWeight:'800'}}>{detail.alias||player.name}</Text>{!!detail.alias&&<Text style={{color:'#aab8cb',fontSize:13,lineHeight:21}}>{player.name}</Text>}</View>
 </View>;
}
