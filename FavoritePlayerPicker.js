import React,{useMemo,useState} from 'react';
import {View,Text,TextInput,Pressable,StyleSheet} from 'react-native';
import roster from './players-seed.json';
import PlayerPortrait from './PlayerPortrait';

const players=roster.teams.flatMap(team=>(team.players||[]).map(player=>({...player,teamId:player.teamId||team.id,teamName:player.teamName||team.name,category:player.category||team.category,competition:team.competition,group:team.group})));
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');

export const favoritePlayerIdsAvailable=new Set(players.map(player=>String(player.id)));

export default function FavoritePlayerPicker({selectedIds=[],onToggle}){
 const [query,setQuery]=useState('');
 const results=useMemo(()=>{const q=normalize(query.trim());if(q.length<2)return [];return players.filter(player=>normalize(`${player.name} ${player.number||''} ${player.category} ${player.teamName}`).includes(q)).slice(0,18)},[query]);
 const selected=players.filter((player,index)=>selectedIds.includes(String(player.id))&&players.findIndex(item=>String(item.id)===String(player.id))===index);
 return <View style={s.container}><Text style={s.heading}>Jugadores favoritos</Text><Text style={s.muted}>Busca por nombre, dorsal o equipo y marca a los jugadores que quieras seguir.</Text><TextInput accessibilityLabel="Buscar jugador favorito" placeholder="Buscar jugador…" placeholderTextColor="#91a5be" value={query} onChangeText={setQuery} style={s.input}/>{selected.length>0&&<View style={{gap:7}}><Text style={s.label}>SELECCIONADOS</Text>{selected.map(player=><PlayerRow key={'selected:'+player.id} player={player} selected onPress={()=>onToggle(String(player.id))}/>)}</View>}{query.trim().length<2?<Text style={s.muted}>{selected.length?'Escribe al menos dos letras para buscar más jugadores.':'Escribe al menos dos letras para buscar entre los jugadores del club.'}</Text>:!results.length?<Text style={s.muted}>No encontramos jugadores con esa búsqueda.</Text>:<View style={{gap:7}}>{results.map(player=><PlayerRow key={`${player.id}:${player.teamId}`} player={player} selected={selectedIds.includes(String(player.id))} onPress={()=>onToggle(String(player.id))}/>)}</View>}</View>;
}

function PlayerRow({player,selected,onPress}){return <Pressable accessibilityRole="checkbox" accessibilityState={{checked:selected}} onPress={onPress} style={[s.player,selected&&s.playerSelected]}><PlayerPortrait playerId={player.id} name={player.name} teamId={player.teamId} size={40}/><View style={{flex:1,minWidth:0,gap:3}}><Text numberOfLines={1} style={s.name}>{player.name}</Text><Text numberOfLines={1} style={s.muted}>{player.category} · Dorsal {player.number||'—'}</Text></View><Text style={[s.check,selected&&s.checkSelected]}>{selected?'✓':'+'}</Text></Pressable>}

const s=StyleSheet.create({container:{gap:11},heading:{fontSize:17,fontWeight:'800',color:'#f0f4fa'},muted:{fontSize:12,lineHeight:19,color:'#aab8cb'},input:{minHeight:48,borderWidth:1,borderColor:'#34475e',backgroundColor:'#101c2b',borderRadius:11,padding:14,fontSize:15,color:'#f0f4fa'},label:{fontSize:10,color:'#91adff',fontWeight:'800',letterSpacing:1},player:{minHeight:62,padding:9,borderRadius:12,borderWidth:1,borderColor:'#34475e',backgroundColor:'#101c2b',flexDirection:'row',alignItems:'center',gap:10},playerSelected:{borderColor:'#91adff',backgroundColor:'#1b2e69'},name:{fontSize:12,color:'#f0f4fa',fontWeight:'700'},check:{width:24,height:24,borderWidth:1,borderColor:'#61758e',borderRadius:12,textAlign:'center',textAlignVertical:'center',color:'#aab8cb',fontSize:18,overflow:'hidden'},checkSelected:{backgroundColor:'#c52321',borderColor:'#c52321',color:'#fff',fontSize:16,fontWeight:'900'}});
