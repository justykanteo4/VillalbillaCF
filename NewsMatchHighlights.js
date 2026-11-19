import React,{useMemo} from 'react';
import {View,Text,Pressable} from 'react-native';
import RffmCrest from './RffmCrest';
const toDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00Z').getTime():NaN;
function choose(teams){
 const now=Date.now();const matches=(teams||[]).flatMap(t=>(t.fixtures||[]).map(m=>({...m,category:t.category||t.name,teamId:t.id}))).filter(m=>Number.isFinite(toDate(m.date)));
 const finished=matches.filter(m=>Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore)&&toDate(m.date)<=now).sort((a,b)=>toDate(b.date)-toDate(a.date))[0];
 const coming=matches.filter(m=>toDate(m.date)>=now&&!Number.isInteger(m.homeScore)).sort((a,b)=>toDate(a.date)-toDate(b.date))[0];
 return {finished,coming};
}
function Card({match,kind}){
 if(!match)return null;
 const result=kind==='finished',date=match.date.split('-').reverse().join('/');
 return <View style={{backgroundColor:'#15386d',borderWidth:1,borderColor:'#437eb8',borderRadius:17,padding:14,gap:11}}>
   <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>
    <View style={{width:86,height:90,backgroundColor:'#205396',borderRadius:13,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#4c9edf'}}>
     <RffmCrest uri={match.homeCrest} name={match.home||'Equipo local'} size={54}/>
    </View>
    <View style={{flex:1,gap:6}}>
      <Text style={{color:'#a8dfff',fontSize:12,fontWeight:'800'}}>📅 {date} · {match.category||'Villalbilla C.F.'}</Text>
      <Text style={{color:'#fff',fontSize:18,fontWeight:'900'}}>{result?'Último resultado':'Próxima jornada'}</Text>
      <Text style={{color:'#d8ebfc',fontSize:13,lineHeight:19}} numberOfLines={3}>{match.home||'Local'} · {match.away||'Visitante'}</Text>
      <Text style={{color:'#ffd77d',fontSize:16,fontWeight:'900'}}>{result?match.homeScore+' – '+match.awayScore:match.time||'Hora por confirmar'}</Text>
    </View>
   </View>
  </View>
}
export default function NewsMatchHighlights({teams=[]}){
 const {finished,coming}=useMemo(()=>choose(teams),[teams]);
 if(!finished&&!coming)return null;
 return <View style={{gap:12}}><Text style={{color:'#fff',fontSize:22,fontWeight:'900'}}>Actualidad del club</Text>{finished&&<Card match={finished} kind="finished"/>}{coming&&<Card match={coming} kind="coming"/>}</View>;
}
