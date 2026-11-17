import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,Modal,ScrollView} from 'react-native';
import {fantasyRequest} from './FantasyLeagues';
import FantasyTeamIdentity,{FantasyTeamPhoto} from './FantasyTeamIdentity';
import theme from './fantasy-theme.cjs';

export default function FantasyTeamHeaderAvatar({leagueId}){
 const [photo,setPhoto]=useState(null),[name,setName]=useState(''),[visible,setVisible]=useState(false);
 useEffect(()=>{let active=true;setPhoto(null);setName('');
  if(!leagueId)return()=>{active=false};
  fantasyRequest('/leagues/'+leagueId+'/team-profile',{cache:'reload'}).then(d=>{
   const mine=d.teams?.find(row=>row.me);if(active){setPhoto(mine?.photo||null);setName(mine?.name||'')}
  }).catch(()=>{});
  return()=>{active=false};
 },[leagueId]);
 async function updated(){
  try{const result=await fantasyRequest('/leagues/'+leagueId+'/team-profile',{cache:'reload'});const mine=result.teams?.find(row=>row.me);setPhoto(mine?.photo||null);setName(mine?.name||'')}catch{}
  setVisible(false);
 }
 if(!leagueId)return <View style={{width:48}}/>;
 return <>
  <Pressable accessibilityRole="button" accessibilityLabel={'Editar equipo Fantasy'+(name?' '+name:'')} onPress={()=>setVisible(true)} style={{width:52,height:52,justifyContent:'center',alignItems:'center',borderRadius:26,borderWidth:2,borderColor:theme.accent}}>
   <FantasyTeamPhoto photo={photo} size={46}/>
  </Pressable>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}>
   <View style={{flex:1,backgroundColor:'#000c',justifyContent:'center',padding:18}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:25,gap:14}}>
     <FantasyTeamIdentity key={leagueId+':'+String(visible)} leagueId={leagueId} request={fantasyRequest} onUpdated={updated}/>
     <Pressable accessibilityRole="button" onPress={()=>setVisible(false)} style={{backgroundColor:theme.panel,padding:17,borderRadius:12,borderWidth:1,borderColor:theme.border}}>
      <Text style={{textAlign:'center',color:theme.text,fontWeight:'800'}}>Cerrar</Text>
     </Pressable>
    </ScrollView>
   </View>
  </Modal>
 </>;
}
