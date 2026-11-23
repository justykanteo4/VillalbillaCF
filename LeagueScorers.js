import {DividerView} from './AppDividers';
import appTheme from './app-theme';
import GoalkeeperStats from './GoalkeeperStats';
import PlayerPortrait from './PlayerPortrait';
import teams from './teams.json';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {api} from './api';
export default function LeagueScorers({teamId}){
 const [data,setData]=useState(null),[expanded,setExpanded]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setData(null);setExpanded(false);const refresh=()=>api('/api/league-scorers?team='+encodeURIComponent(teamId),{onUpdate:value=>{if(active){setData(value);setError(!!value.error)}}}).then(value=>{if(active){setData(value);setError(!!value.error)}}).catch(()=>{if(active)setError(true)});refresh();const timer=setInterval(refresh,300000);return()=>{active=false;clearInterval(timer)}},[teamId]);
 const rows=data?.players||[];
 return <DividerView style={{paddingVertical:18,paddingHorizontal:8,borderRadius:18,backgroundColor:appTheme.panel,borderTopWidth:appTheme.lineWidth,borderBottomWidth:appTheme.lineWidth,borderColor:appTheme.accent,gap:14,width:'100%'}}><Text style={{color:'#fff',fontSize:22,fontWeight:'800'}}>Goleadores de la liga</Text>{error&&<Text style={{color:'#ffc1c9'}}>No se pudo actualizar. Se muestra la última copia disponible.</Text>}{!rows.length&&<Text style={{color:'#aab8cb'}}>{data?.available===false?'No se publican goleadores para este grupo.':data?'No hay goleadores publicados.':'Consultando goleadores…'}</Text>}{(expanded?rows:rows.slice(0,10)).map(row=><DividerView key={row.id+'-'+row.teamId} style={{flexDirection:'row',gap:10,paddingVertical:10,borderBottomWidth:appTheme.lineWidth,borderColor:appTheme.accent}}><Text style={{color:appTheme.accent,width:28}}>{row.position}</Text>{teams.some(t=>t.id===row.teamId)&&<PlayerPortrait playerId={row.id} name={row.name} teamId={row.teamId} size={44}/>}<View style={{flex:1}}><Text style={{color:'#fff'}}>{row.name}</Text><Text style={{color:'#aab8cb',fontSize:12}}>{row.teamName}</Text><GoalkeeperStats lookup teamId={teams.some(t=>t.id===row.teamId)?row.teamId:null} playerId={row.id}/></View><Text style={{color:appTheme.accent,fontWeight:'800'}}>{row.goals}</Text></DividerView>)}{rows.length>10&&<Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)}><Text style={{color:appTheme.accent}}>{expanded?'Ver los 10 primeros ⌃':'Ver todos los goleadores ⌄'}</Text></Pressable>}</DividerView>;
}
