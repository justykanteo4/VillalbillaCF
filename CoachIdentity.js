import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
import teams from './teams.json';
import seed from './players-seed.json';
import {detectPlayer} from './team-experience.cjs';
export default function CoachIdentity({account,teamId}){
 const name=account?.claim?.assignments?.find(t=>t.teamId===teamId)?.name||account?.claim?.name||account?.name;
 const [standing,setStanding]=useState(null),[player,setPlayer]=useState(null);
 useEffect(()=>{let alive=true;setStanding(null);api('/api/standings?team='+teamId,{onUpdate:v=>{if(alive)setStanding(v.rows?.find(r=>r.id===teamId))}}).then(v=>{if(alive)setStanding(v.rows?.find(r=>r.id===teamId))}).catch(()=>{});return()=>{alive=false}},[teamId]);
 useEffect(()=>{
  let alive=true;setPlayer(null);
  const key='villalbilla.dual-role.v1.'+account.id+'.'+name;
  async function load(){
   let match=account.claim?.isPlayer&&account.claim?.playerTeams?.[0]?{id:account.claim.playerTeams[0].playerId,name:account.claim.name,teamId:account.claim.playerTeams[0].teamId}:null,stored;try{stored=JSON.parse(await AsyncStorage.getItem(key)||'null')}catch{}
   if(match){}
   else if(stored&&Date.now()-stored.savedAt<7*86400000)match=stored.player;
   else{
    let complete=true;let rows=seed.teams.flatMap(t=>t.players.map(p=>({...p,teamId:t.id})));
    // Official rosters identify a player; this never grants trainer permissions.
    for(let i=0;i<teams.length;i+=3){const values=await Promise.all(teams.slice(i,i+3).map(t=>api('/api/team-roster?team='+t.id).catch(()=>null)));if(!alive)return;values.forEach((v,j)=>{if(!v||v.error)complete=false;if(v&&!v.error){const id=teams[i+j].id;rows=rows.filter(p=>p.teamId!==id).concat((v.players||[]).map(p=>({...p,teamId:id})))}})}
    match=complete?detectPlayer(name,rows):null;if(complete)await AsyncStorage.setItem(key,JSON.stringify({player:match,savedAt:Date.now()}));
   }
   if(!alive)return;
   if(match){setPlayer(match);const data=await api('/api/players?team='+match.teamId,{onUpdate:v=>{if(alive)setPlayer(v.players?.find(p=>String(p.id)===String(match.id))||match)}});if(alive)setPlayer(data.players?.find(p=>String(p.id)===String(match.id))||match)}
  }
  load().catch(()=>{});return()=>{alive=false};
 },[account.id,name]);
 const text={color:'#aab8cb',lineHeight:22};
 return <View style={{padding:16,gap:8,borderRadius:16,backgroundColor:'#151f2d'}}><Text style={text}>Entrenador · {teams.find(t=>t.id===teamId)?.category}</Text><Text style={text}>Temporada del equipo · {[['PG','won'],['PE','drawn'],['PP','lost'],['GF','gf'],['GC','ga']].map(([label,key])=>label+' '+(standing?.[key]??'—')).join('   ')}</Text>{player&&<><Text style={{color:'#91adff',fontWeight:'800'}}>También jugador · {teams.find(t=>t.id===player.teamId)?.category}</Text><Text style={text}>{[['Partidos','played'],['Goles','goals'],['Amarillas','yellow'],['Rojas','red']].map(([label,key])=>label+' '+(player[key]??'—')).join(' · ')}</Text></>}</View>;
}
