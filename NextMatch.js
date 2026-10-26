import React,{useState,useEffect} from 'react';
import {View,Text,StyleSheet,Pressable} from 'react-native';
import {api} from './api';
import {loadTeamCalendar} from './team-calendar';
import seed from './news-seed.json';
import standingsSeed from './standings-seed.json';
import VenueDirections from './VenueDirections';
import MatchWeather from './MatchWeather';
import Sanctions from './Sanctions';
import {upcoming} from './upcoming.cjs';
import {isHome,opponent as rivalName} from './team-identity.cjs';

export default function NextMatch({teamId='680163',showFollowing=true,showWeather=true,showOpponentSanctions=false,showTeamSanctions=false}){
  const [team,setTeam]=useState(seed.teams.find(t=>t.id===teamId));
  const [acta,setActa]=useState(null);
  const [standings,setStandings]=useState(standingsSeed[teamId]||null);
  const [expanded,setExpanded]=useState(false);
  const [rivalExpanded,setRivalExpanded]=useState(null);
  const [error,setError]=useState(false);

  useEffect(()=>{
    let active=true;
    setTeam(seed.teams.find(t=>t.id===teamId));
    setExpanded(false);
    async function refresh(){
      try{const data=await loadTeamCalendar(teamId,{onUpdate:value=>{if(active){setTeam(value);setError(!!value.error)}}});if(active){setTeam(data);setError(!!data.error)}}
      catch{if(active)setError(true)}
    }
    refresh();const timer=setInterval(refresh,300000);
    return()=>{active=false;clearInterval(timer)};
  },[teamId]);

  useEffect(()=>{
    let active=true;
    setStandings(standingsSeed[teamId]||null);
    async function refresh(){try{const data=await api('/api/standings?team='+encodeURIComponent(teamId),{onUpdate:value=>{if(active&&Array.isArray(value?.rows))setStandings(value)}});if(active&&Array.isArray(data?.rows))setStandings(data)}catch{}}
    refresh();const timer=setInterval(refresh,300000);
    return()=>{active=false;clearInterval(timer)};
  },[teamId]);

  const matches=upcoming(team?.fixtures||[],new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}));
  const next=matches[0];

  useEffect(()=>{
    let active=true;setActa(null);if(!next)return;
    async function fetchActa(){try{const data=await api('/api/match?team='+encodeURIComponent(teamId)+'&match='+encodeURIComponent(next.id)+'&refresh=1',{onUpdate:value=>{if(active)setActa(value)}});if(active)setActa(data)}catch{if(active)setActa({error:true})}}
    fetchActa();const timer=setInterval(fetchActa,60000);
    return()=>{active=false;clearInterval(timer)};
  },[teamId,next?.id]);

  const opponent=match=>rivalName(match,team);
  const positionFor=match=>{
    const rivalId=isHome(match,team)?match.awayId:match.homeId;
    const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();
    const row=standings?.rows?.find(item=>rivalId&&String(item.id)===String(rivalId))||standings?.rows?.find(item=>clean(item.name)===clean(opponent(match)));
    return row;
  };

  return <View style={{gap:16}}>
    {showTeamSanctions&&<Sanctions key={'team-sanctions-'+teamId} teamId={teamId} compact teamAlertsOnly/>}
    <View style={s.card}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={{gap:10}}>
        <View style={s.top}><Text style={s.kicker}>SIGUIENTE PARTIDO</Text><Text style={s.arrow}>{expanded?'−':'+'}</Text></View>
        <Text style={s.heading}>{team?.category||'Tu equipo'}</Text>
        {next?<>
          <Text style={s.opponent}>{isHome(next,team)?team?.name:opponent(next)}</Text>
          <Text style={s.vs}>VS</Text>
          <Text style={s.opponent}>{isHome(next,team)?opponent(next):team?.name}</Text>
          <Text style={s.date}>{next.date.split('-').reverse().join('/')} · {next.time||'Hora por confirmar'}</Text>
          <Text style={s.muted}>Jornada {next.round} · {isHome(next,team)?'En casa':'Fuera'} · Pulsa para ver los detalles</Text>
        </>:<Text style={s.muted}>No hay próximos partidos publicados para este equipo.</Text>}
      </Pressable>
      {showOpponentSanctions&&expanded&&next&&<Sanctions key={`rival-sanctions-${teamId}`} teamId={teamId} compact rivalOnly/>}
      {expanded&&next&&<View style={s.details}>
        <Text style={s.kicker}>DETALLES DEL ENCUENTRO</Text>
        <Text style={s.muted}>{isHome(next,team)?'Local':'Visitante'} · {next.date.split('-').reverse().join('/')} · {next.time||'Hora por confirmar'} · Jornada {next.round}</Text>
        <VenueDirections fieldId={acta?.venueId||next.venueId} venue={acta?.venue||next.venue}/>
        {showWeather&&<MatchWeather fieldId={acta?.venueId||next.venueId} date={next.date} time={next.time}/>}
        <View style={s.referee}>
          <Text style={s.kicker}>EQUIPO ARBITRAL</Text>
          {!acta?<Text style={s.muted}>Consultando designación…</Text>:acta.error?<Text style={s.muted}>No se ha podido consultar la designación arbitral.</Text>:acta.referees?.length?acta.referees.map((referee,index)=><View key={index} style={{gap:4}}><Text style={s.muted}>{referee.role}</Text><Text style={s.name}>{referee.name}</Text></View>):<Text style={s.muted}>Árbitro pendiente de designación o no publicado por la RFFM.</Text>}
        </View>
      </View>}
      {(error||team?.error)&&<Text style={s.muted}>No se ha podido actualizar el calendario. Mostramos la última información disponible.</Text>}
    </View>
    {showFollowing&&matches.length>1&&<View style={s.card}>
      <Text style={s.heading}>Los tres próximos rivales</Text>
      {matches.slice(1,4).map((match,index)=><View key={match.id}><Pressable accessibilityRole="button" accessibilityState={{expanded:rivalExpanded===match.id}} onPress={()=>setRivalExpanded(rivalExpanded===match.id?null:match.id)} style={s.rival}>
        <View style={s.number}><Text style={s.numberText}>{index+1}</Text></View>
        <View style={{flex:1,gap:3}}><Text style={s.rivalName}>{opponent(match)}</Text><Text style={s.muted}>Jornada {match.round} · {match.date.split('-').reverse().join('/')}</Text></View>
        <View style={s.position}><Text style={s.positionValue}>{positionFor(match)?.position??'—'}</Text><Text style={s.positionLabel}>puesto</Text></View>
      </Pressable>{rivalExpanded===match.id&&<Text style={s.muted}>{[['PG','won'],['PE','drawn'],['PP','lost'],['GF','gf'],['GC','ga']].map(([label,key])=>label+' '+(positionFor(match)?.[key]??'—')).join('   ')}</Text>}</View>)}
    </View>}
  </View>;
}

const s=StyleSheet.create({
  card:{backgroundColor:'#151f2d',padding:20,borderRadius:20,borderWidth:1,borderColor:'#2d3e52',gap:14},
  top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  kicker:{color:'#91adff',fontSize:11,letterSpacing:1,fontWeight:'800'},
  heading:{color:'#fff',fontSize:21,fontWeight:'800'},
  opponent:{color:'#f0f4ff',fontSize:19,lineHeight:26,fontWeight:'800'},
  vs:{color:'#ff9995',fontSize:13,fontWeight:'900'},
  date:{color:'#91adff',fontWeight:'700',fontSize:16},
  muted:{color:'#aab8cb',fontSize:12,lineHeight:21},
  details:{gap:16,borderTopWidth:1,borderColor:'#2d3e52',paddingTop:16},
  referee:{gap:10,paddingTop:14,borderTopWidth:1,borderColor:'#2d3e52'},
  name:{color:'#f0f4ff',fontSize:14,fontWeight:'700',lineHeight:22},
  arrow:{fontSize:21,color:'#91adff'},
  rival:{flexDirection:'row',gap:11,alignItems:'center',paddingTop:14,borderTopWidth:1,borderColor:'#2d3e52'},
  number:{width:28,height:28,borderRadius:14,backgroundColor:'#1b2e69',alignItems:'center',justifyContent:'center'},
  numberText:{color:'#dce6ff',fontSize:12,fontWeight:'800'},
  rivalName:{flex:1,fontSize:14,color:'#eaf0fa',lineHeight:20,fontWeight:'700'},
  position:{minWidth:56,alignItems:'center',paddingHorizontal:8,paddingVertical:5,borderRadius:10,backgroundColor:'#0b121d'},
  positionValue:{fontSize:17,color:'#91adff',fontWeight:'900'},
  positionLabel:{fontSize:9,color:'#aab8cb'},
});
