import {useBackAction} from './useBackNavigation';
import React,{useState,useEffect,useRef} from 'react';
import {View,Text,Pressable,StyleSheet,AppState,Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
import seed from './news-seed.json';
import VenueDirections from './VenueDirections';
import MatchWeather from './MatchWeather';
import FavoritePlayers from './FavoritePlayers';
import ClubNewsSummary from './ClubNewsSummary';
import CachedImage from './CachedImage';
import {instagramPostUrl} from './instagram-post.cjs';
import MatchEvents from './MatchEvents';
import {datePeriod,periodEnd,resultDateOptions,matchesByDate,toggleResultTeam,hasResult,resultTeamName} from './result-dates.cjs';
import ResultTeamSelector from './ResultTeamSelector';
import TeamSelector from './TeamSelector';
import {VisitCounter} from './AppVisits';

function UpcomingMatchCard({match}){
  const [expanded,setExpanded]=useState(false);
  const home=resultTeamName(match.home,match.homeId,match.team),away=resultTeamName(match.away,match.awayId,match.team);
  useBackAction(()=>{setExpanded(false);return true},20,expanded);
  return <View style={s.upcomingCard}><Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={'Detalles: '+home+(hasResult(match)?' '+match.homeScore+' a '+match.awayScore+' ':' vs ')+away} onPress={()=>setExpanded(v=>!v)} style={{gap:10}}><View style={s.scoreboard}><Text style={[s.team,s.scoreTeam]}>{home}</Text><Text style={hasResult(match)?s.score:s.vs}>{hasResult(match)?match.homeScore+' — '+match.awayScore:'VS'}</Text><Text style={[s.team,s.scoreTeam]}>{away}</Text></View><Text style={s.link}>{expanded?'Ocultar detalles −':'Ver detalles +'}</Text></Pressable>{expanded&&<View style={{gap:12}}><Text style={s.kicker}>{match.team.category} · Jornada {match.round}</Text><Text style={s.muted}>{match.date?match.date.split('-').reverse().join('/'):'Fecha por confirmar'} · {match.time||'Hora por confirmar'}</Text><VenueDirections fieldId={match.venueId} venue={match.venue}/><MatchWeather fieldId={match.venueId} date={match.date} time={match.time}/><MatchEvents match={match} onVenue={()=>{}}/></View>}</View>;
}

export default function News({mode='news',favoriteTeamIds=[],favoritePlayerIds=[],favoritesOnly=false}){
  const [news,setNews]=useState(seed),[ig,setIg]=useState({connected:false,posts:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[teamIds,setTeamIds]=useState([]),[dateSelection,setDateSelection]=useState('auto');
  const alive=useRef(true),newsUpdated=useRef(false),inFlight=useRef(false);
  async function refresh(force=false){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);
    const applyNews=value=>{if(alive.current){newsUpdated.current=true;setNews(value);setError(value.offline?'No se pudo actualizar. Mostramos la información guardada.':'');AsyncStorage.setItem('villalbilla.public.news',JSON.stringify(value)).catch(()=>{})}};
    const applyInstagram=value=>{if(alive.current)setIg({...value,posts:(value.posts||[]).slice(0,8)})};
    const failNews=()=>{if(alive.current)setError('No se pudo actualizar. Mostramos la última información disponible.')};
    await Promise.allSettled([
      api('/api/news',{cache:force?'reload':undefined,onUpdate:applyNews,onRefreshError:failNews}).then(applyNews).catch(failNews),
      api('/api/instagram',{onUpdate:applyInstagram}).then(applyInstagram).catch(()=>{if(alive.current)setIg(value=>({...value,error:true}))}),
    ]);
    if(alive.current)setBusy(false);
    inFlight.current=false;
  }

  useEffect(()=>{
    alive.current=true;
    AsyncStorage.getItem('villalbilla.public.news').then(value=>{if(value&&alive.current){const stored=JSON.parse(value);if(Array.isArray(stored.teams)&&!newsUpdated.current)setNews(stored)}}).catch(()=>{});
    refresh();const timer=setInterval(refresh,300000),subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
    return()=>{alive.current=false;clearInterval(timer);subscription.remove()};
  },[]);

  const favoriteSet=new Set(favoriteTeamIds),orderedTeams=[...news.teams].sort((a,b)=>Number(favoriteSet.has(b.id))-Number(favoriteSet.has(a.id))||a.category.localeCompare(b.category,'es'));
  const availableTeams=mode!=='results'&&favoritesOnly?orderedTeams.filter(item=>favoriteSet.has(item.id)):orderedTeams;
  const activeIds=teamIds.filter(id=>availableTeams.some(item=>item.id===id)),selected=availableTeams.filter(item=>!activeIds.length||activeIds.includes(item.id));
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});

  const dates=resultDateOptions(selected,today),activeDate=dateSelection==='auto'||!dates.includes(dateSelection)?datePeriod(today):dateSelection,dateIndex=dates.indexOf(activeDate),matches=matchesByDate(selected,activeDate);
  const dateLabel=value=>value==='undated'?'Fecha por confirmar':value.split('-').reverse().join('/')+' — '+periodEnd(value).split('-').reverse().join('/');
  const results=(<><Pressable accessibilityRole="button" disabled={busy} onPress={()=>refresh(true)} style={s.chip}><Text style={s.white}>{busy?'Actualizando…':'Actualizar resultados'}</Text></Pressable><ResultTeamSelector selected={activeIds} onChange={id=>setTeamIds(toggleResultTeam(activeIds,id,availableTeams.map(t=>t.id)))} options={availableTeams}/><View style={s.dateNavigation}><Pressable accessibilityRole="button" accessibilityLabel="Fechas anteriores" disabled={dateIndex<=0} onPress={()=>setDateSelection(dates[dateIndex-1])} style={[s.chip,dateIndex<=0&&s.disabled]}><Text style={s.white}>←</Text></Pressable><View style={{flex:1,minWidth:0}}><TeamSelector label="Fechas" value={activeDate} onChange={setDateSelection} options={dates.map(date=>({id:date,category:dateLabel(date),name:date===datePeriod(today)?'Actual':'Partidos'}))}/></View><Pressable accessibilityRole="button" accessibilityLabel="Fechas siguientes" disabled={dateIndex<0||dateIndex>=dates.length-1} onPress={()=>setDateSelection(dates[dateIndex+1])} style={[s.chip,(dateIndex<0||dateIndex>=dates.length-1)&&s.disabled]}><Text style={s.white}>→</Text></Pressable></View><Text style={s.muted}>Primero aparecen los partidos con resultado. Los resultados del fin de semana se mantienen hasta el lunes. Desde el martes aparece el siguiente intervalo de fechas.</Text>{!!error&&<Text style={s.warning}>{error}</Text>}{matches.map((match,index)=><View key={match.team.id+':'+match.id} style={{gap:10}}>{(index===0||matches[index-1].date!==match.date)&&<Text style={s.upcomingDate}>{match.date?match.date.split('-').reverse().join('/'):'Fecha por confirmar'}</Text>}<UpcomingMatchCard match={match}/></View>)}{!matches.length&&<Text style={s.muted}>No hay partidos publicados para estas fechas.</Text>}</>);

  const instagram=(<>
    {!ig.posts.length&&<Text style={s.muted}>{ig.error?'No se pudieron actualizar las fotos.':'Todavía no hay fotos disponibles.'}</Text>}
    {ig.posts.slice(0,8).filter(post=>post.images?.length).map(post=><Pressable key={post.id} accessibilityRole="link" accessibilityLabel="Abrir publicación de Instagram y ver más información" onPress={()=>Linking.openURL(instagramPostUrl(post)).catch(()=>setError('No se pudo abrir Instagram.'))} style={s.photo}>
      <CachedImage uri={post.images[0]} accessibilityLabel={post.caption||'Publicación de Villalbilla C.F.'} style={{width:'100%',aspectRatio:1}} resizeMode="contain"/>
    </Pressable>)}
  </>);

  return <View style={{gap:18}}>
    {mode==='results'?<><Text style={s.title}>Resultados</Text>{results}</>:<>
      <ClubNewsSummary teams={news.teams}/>
      {instagram}
      {!!error&&<Text style={s.warning}>{error}</Text>}
      <FavoritePlayers favoritePlayerIds={favoritePlayerIds}/>
      <VisitCounter/>
    </>}
  </View>;
}

const s=StyleSheet.create({
  scoreboard:{flexDirection:'row',alignItems:'center',gap:10},scoreTeam:{flex:1,minWidth:0,textAlign:'center'},
  dateNavigation:{flexDirection:'row',alignItems:'center',gap:8},disabled:{opacity:0.35},
  photo:{borderRadius:16,overflow:'hidden',backgroundColor:'#0b121d'},
  title:{fontSize:32,lineHeight:38,fontWeight:'900',color:'#fff'},kicker:{fontSize:11,letterSpacing:1,color:'#91adff',fontWeight:'800'},muted:{fontSize:13,lineHeight:21,color:'#aab8cb'},row:{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},chip:{backgroundColor:'#25364c',borderRadius:10,padding:12},active:{backgroundColor:'#b42122'},white:{color:'#fff',fontWeight:'700'},link:{color:'#91adff',fontWeight:'700',paddingVertical:8},card:{padding:20,borderRadius:20,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52',gap:13},heading:{color:'#fff',fontSize:18,fontWeight:'800'},warning:{color:'#ffc1c9',lineHeight:21},filter:{color:'#dce6f2',fontSize:10},team:{color:'#eaf0fa',fontSize:15,lineHeight:23,fontWeight:'600'},score:{color:'#50EBEC',fontWeight:'900',fontSize:25},match:{borderTopWidth:1,borderColor:'#2d3e52',paddingTop:13,gap:10},upcomingCard:{backgroundColor:'#0b121d',padding:15,borderRadius:15,borderWidth:1,borderColor:'#2d3e52',gap:10},upcomingDate:{color:'#91adff',fontSize:13,fontWeight:'700'},vs:{fontSize:11,color:'#ff9995',fontWeight:'900'},expandIcon:{fontSize:18,color:'#91adff'},venueDetails:{borderTopWidth:1,borderColor:'#2d3e52',paddingTop:13},
});
