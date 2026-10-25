import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,StyleSheet,AppState} from 'react-native';
import {api} from './api';
import roster from './players-seed.json';
import standingsSeed from './standings-seed.json';
import PlayerPortrait from './PlayerPortrait';

const players=roster.teams.flatMap(team=>(team.players||[]).map(player=>({...player,teamId:player.teamId||team.id,teamName:player.teamName||team.name,category:player.category||team.category,group:team.group})));
const getClubRow=data=>data?.rows?.find(row=>/VILLALBILLA/i.test(row.name));

export default function FavoritePlayers({favoritePlayerIds=[]}){
 const [positions,setPositions]=useState(()=>Object.fromEntries(Object.entries(standingsSeed).map(([teamId,data])=>[teamId,getClubRow(data)?.position||null])));
 const favoritePlayers=useMemo(()=>favoritePlayerIds.map(id=>players.find(player=>String(player.id)===String(id))).filter(Boolean),[favoritePlayerIds]);
 const teamIds=[...new Set(favoritePlayers.map(player=>String(player.teamId)))];
 useEffect(()=>{let active=true,running=false;async function refresh(){if(running)return;running=true;const results=await Promise.allSettled(teamIds.map(teamId=>api('/api/standings?team='+teamId,{onUpdate:value=>{if(active)setPositions(current=>({...current,[teamId]:getClubRow(value)?.position||null}))}})));if(active){setPositions(current=>{const next={...current};results.forEach((result,index)=>{if(result.status==='fulfilled')next[teamIds[index]]=getClubRow(result.value)?.position||null});return next})}running=false}if(teamIds.length)refresh();const timer=setInterval(refresh,300000),sub=AppState.addEventListener('change',state=>{if(state==='active')refresh()});return()=>{active=false;clearInterval(timer);sub.remove()}},[teamIds.join('|')]);
 if(!favoritePlayers.length)return null;
 return <View style={s.panel}><Text style={s.kicker}>MIS JUGADORES FAVORITOS</Text><Text style={s.title}>Sigue a tus jugadores</Text>{favoritePlayers.map(player=><View key={player.id} style={s.card}><PlayerPortrait playerId={player.id} name={player.name} teamId={player.teamId} size={64}/><View style={{flex:1,minWidth:0,gap:5}}><Text numberOfLines={2} style={s.name}>{player.name}</Text><Text style={s.detail}>{player.category} · {player.teamName}</Text><Text style={s.detail}>Competición {player.category} · {player.group||'Grupo por confirmar'}</Text><Text style={s.detail}>Dorsal {player.number||'—'} · Partidos {player.played??'—'} · Goles {player.goals??'—'}</Text><Text style={s.position}>{positions[String(player.teamId)]?`${positions[String(player.teamId)]}º en liga`:'Puesto de liga no publicado'}</Text></View></View>)}</View>;
}

const s=StyleSheet.create({panel:{gap:13},kicker:{fontSize:11,letterSpacing:1,color:'#91adff',fontWeight:'800'},title:{fontSize:22,color:'#fff',fontWeight:'800'},card:{padding:14,borderRadius:16,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52',flexDirection:'row',alignItems:'center',gap:13},name:{fontSize:14,color:'#fff',fontWeight:'800',lineHeight:20},detail:{fontSize:11,color:'#aab8cb',lineHeight:17},position:{color:'#91adff',fontSize:12,fontWeight:'800',paddingTop:2}});
