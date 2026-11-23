import {DividerView,SectionStack} from './AppDividers';
import appTheme from './app-theme';
import RffmCrest from './RffmCrest';
import SponsorCarousel from './SponsorCarousel';
import {publishAdminTaskNews,subscribeAdminTaskNews} from './AdminPendingTasks';
import AdminMatchMvp from './AdminMatchMvp';
import AdminResultEditor from './AdminResultEditor';
import FantasyNewsAccess from './FantasyNewsAccess';
import {useBackAction} from './useBackNavigation';
import React,{useState,useEffect,useRef} from 'react';
import {View,Text,Pressable,StyleSheet,AppState,Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
import {readCopy,saveCopy} from './offline';
import {mergeResults,refreshResults} from './results-refresh.cjs';
import {matchWithReport} from './match-report.cjs';
import clubTeams from './teams.json';
import seed from './news-seed.json';
import VenueDirections from './VenueDirections';
import MatchWeather from './MatchWeather';
import FavoritePlayers from './FavoritePlayers';
import ClubNewsSummary from './ClubNewsSummary';
import CachedImage from './ViewportImage';
import {instagramPostUrl} from './instagram-post.cjs';
import MatchEvents from './MatchEvents';
import {datePeriod,periodEnd,resultDateOptions,matchesByDate,toggleResultTeam,hasResult,resultTeamName} from './result-dates.cjs';
import ResultTeamSelector from './ResultTeamSelector';
import TeamSelector from './TeamSelector';
import {VisitCounter} from './AppVisits';

function UpcomingMatchCard({match:sourceMatch,initialExpanded=false,account,onEdited}){
  const [expanded,setExpanded]=useState(initialExpanded),[report,setReport]=useState(null),[edited,setEdited]=useState(null);
  const match={...matchWithReport(sourceMatch,report),...edited};
  const home=resultTeamName(match.home,match.homeId,match.team),away=resultTeamName(match.away,match.awayId,match.team);
  useBackAction(()=>{setExpanded(false);return true},20,expanded);
  return <DividerView style={s.upcomingCard}><Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={'Detalles: '+home+(hasResult(match)?' '+match.homeScore+' a '+match.awayScore+' ':' vs ')+away} onPress={()=>setExpanded(v=>!v)} style={{gap:10}}><View style={s.scoreboard}><View style={s.scoreSide}><RffmCrest uri={match.homeCrest} name={home} size={40}/><Text style={[s.team,s.scoreTeam]}>{home}</Text></View><Text style={hasResult(match)?s.score:s.vs}>{hasResult(match)?match.homeScore+' — '+match.awayScore:'VS'}</Text><View style={s.scoreSide}><RffmCrest uri={match.awayCrest} name={away} size={40}/><Text style={[s.team,s.scoreTeam]}>{away}</Text></View></View><Text style={s.link}>{expanded?'Ocultar detalles −':'Ver detalles +'}</Text></Pressable>{expanded&&<View style={{gap:12}}><Text style={s.kicker}>{match.team.category} · Jornada {match.round}</Text><Text style={s.muted}>{match.date?match.date.split('-').reverse().join('/'):'Fecha por confirmar'}{!hasResult(match)?' · '+(match.time||'Hora por confirmar'):''}</Text>{!hasResult(match)&&<><VenueDirections fieldId={match.venueId} venue={match.venue}/><MatchWeather fieldId={match.venueId} date={match.date} time={match.time}/></>}<AdminMatchMvp match={match} account={account}/><AdminResultEditor match={match} account={account} onSaved={fixture=>{setEdited(fixture);onEdited?.(sourceMatch.team.id,fixture)}}/><MatchEvents match={match} onVenue={()=>{}} onUpdate={setReport} forceRefresh={initialExpanded}/></View>}</DividerView>;
}

export function NotificationMatch({target,onClose,account,onEdited}){
 const find=calendar=>{const fixture=calendar?.fixtures?.find(m=>String(m.id)===target.matchId);return fixture?{...fixture,team:{...clubTeams.find(t=>t.id===target.teamId),...calendar}}:null};
 const [match,setMatch]=useState(()=>find(seed.teams.find(t=>t.id===target.teamId))),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;const controller=new AbortController();setBusy(true);setError('');const apply=value=>{if(!active)return;const found=find(value);if(found)setMatch(found);if(value.error)setError('No se pudo actualizar. Mostramos la información disponible.');else if(!found)setError('Este partido no está disponible en el calendario consultado. Puedes reintentar o ver todos los resultados.')};api('/api/team-calendar?team='+target.teamId,{signal:controller.signal,cache:retry?'reload':undefined,onUpdate:apply}).then(apply).catch(()=>{if(active)setError('No se pudo consultar el partido. Comprueba la conexión o reintenta.')}).finally(()=>{if(active)setBusy(false)});return()=>{active=false;controller.abort()}},[target.teamId,target.matchId,retry]);
 return <SectionStack style={{gap:14}}><Text style={s.kicker}>Partido del aviso</Text><Pressable accessibilityRole="button" onPress={onClose} style={s.chip}><Text style={s.white}>Ver todos los resultados</Text></Pressable>{!!error&&<Text style={s.warning}>{error}</Text>}{match?<UpcomingMatchCard key={target.teamId+':'+target.matchId} match={match} initialExpanded account={account} onEdited={onEdited}/>:<Text style={s.muted}>{busy?'Buscando el partido del aviso…':'No hay información disponible de este partido.'}</Text>}<Pressable accessibilityRole="button" disabled={busy} onPress={()=>setRetry(n=>n+1)} style={s.chip}><Text style={s.white}>{busy?'Comprobando partido…':'Volver a consultar el partido'}</Text></Pressable></SectionStack>;
}

export default function News({mode='news',favoriteTeamIds=[],favoritePlayerIds=[],favoritesOnly=false,initialMatch=null,onOpenFantasy=null,account=null}){
  const [target,setTarget]=useState(initialMatch);
  useBackAction(()=>{setTarget(null);return true},25,!!target);
  const [news,setNews]=useState(seed),[ig,setIg]=useState({connected:false,posts:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[teamIds,setTeamIds]=useState([]),[dateSelection,setDateSelection]=useState('auto');
  const newsRef=useRef(seed),refreshController=useRef(null),persistTimer=useRef(null);
  const persistNews=()=>{clearTimeout(persistTimer.current);const value=newsRef.current;AsyncStorage.setItem('villalbilla.public.news',JSON.stringify(value)).catch(()=>{});saveCopy('/api/news',value).catch(()=>{})};
  const alive=useRef(true),newsUpdated=useRef(false),inFlight=useRef(false),lastRefresh=useRef(0);
  useEffect(()=>subscribeAdminTaskNews(value=>{if(alive.current){newsRef.current=mergeResults(newsRef.current,value);setNews(newsRef.current);persistNews()}}),[]);
  async function refresh(force=false){
    if(inFlight.current||!force&&['background','inactive'].includes(AppState.currentState))return;
    if(!force&&Date.now()-lastRefresh.current<300000)return;
    inFlight.current=true;lastRefresh.current=Date.now();setBusy(true);const controller=new AbortController();refreshController.current=controller;
    const applyNews=value=>{if(alive.current){newsUpdated.current=true;newsRef.current=mergeResults(newsRef.current,value);setNews(newsRef.current);publishAdminTaskNews(newsRef.current);if(newsRef.current.teams.every(t=>!t.error&&!t.offline))setError('');clearTimeout(persistTimer.current);persistTimer.current=setTimeout(persistNews,250)}};
    setError('');
    if(mode==='news')api('/api/instagram',{onUpdate:value=>{if(alive.current)setIg({...value,posts:(value.posts||[]).slice(0,8)})}}).then(value=>{if(alive.current)setIg({...value,posts:(value.posts||[]).slice(0,8)})}).catch(()=>{if(alive.current)setIg(value=>({...value,error:true}))});
    const result=await refreshResults(newsRef.current.teams,{loadTeam:api,force,signal:controller.signal,onTeam:team=>applyNews({teams:[team]})});
    if(alive.current&&result.failed)setError('Algunos equipos no se pudieron actualizar. Se conservan sus resultados guardados.');
    if(alive.current){setBusy(false);persistNews()}
    inFlight.current=false;
  }

  useEffect(()=>{
    alive.current=true;
    AsyncStorage.getItem('villalbilla.public.news').then(value=>{if(value&&alive.current){const stored=JSON.parse(value);if(Array.isArray(stored.teams)&&!newsUpdated.current)setNews(newsRef.current=mergeResults(newsRef.current,stored))}}).catch(()=>{});
    readCopy('/api/news').then(copy=>{if(alive.current&&copy?.data?.teams){newsRef.current=mergeResults(newsRef.current,copy.data);setNews(newsRef.current)}}).catch(()=>{});
    refresh();const timer=setInterval(()=>refresh(),300000),subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
    return()=>{alive.current=false;persistNews();refreshController.current?.abort();clearInterval(timer);subscription.remove()};
  },[]);

  const editedResult=(teamId,fixture)=>{const next={...newsRef.current,teams:newsRef.current.teams.map(team=>({...team,fixtures:(team.fixtures||[]).map(m=>String(m.id)===String(fixture.id)?{...m,...fixture}:m)}))};newsRef.current=next;setNews(next);publishAdminTaskNews(next);persistNews()};
  const favoriteSet=new Set(favoriteTeamIds),orderedTeams=[...news.teams].sort((a,b)=>Number(favoriteSet.has(b.id))-Number(favoriteSet.has(a.id))||a.category.localeCompare(b.category,'es'));
  const availableTeams=mode!=='results'&&favoritesOnly?orderedTeams.filter(item=>favoriteSet.has(item.id)):orderedTeams;
  const activeIds=teamIds.filter(id=>availableTeams.some(item=>item.id===id)),selected=availableTeams.filter(item=>!activeIds.length||activeIds.includes(item.id));
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});

  const dates=resultDateOptions(selected,today),activeDate=dateSelection==='auto'||!dates.includes(dateSelection)?datePeriod(today):dateSelection,dateIndex=dates.indexOf(activeDate),matches=matchesByDate(selected,activeDate);
  const dateLabel=value=>value==='undated'?'Fecha por confirmar':value.split('-').reverse().join('/')+' — '+periodEnd(value).split('-').reverse().join('/');
  const results=(<><Pressable accessibilityRole="button" disabled={busy} onPress={()=>refresh(true)} style={s.chip}><Text style={s.white}>{busy?'Actualizando…':'Actualizar resultados'}</Text></Pressable><ResultTeamSelector selected={activeIds} onChange={id=>setTeamIds(toggleResultTeam(activeIds,id,availableTeams.map(t=>t.id)))} options={availableTeams}/><View style={s.dateNavigation}><Pressable accessibilityRole="button" accessibilityLabel="Fechas anteriores" disabled={dateIndex<=0} onPress={()=>setDateSelection(dates[dateIndex-1])} style={[s.chip,dateIndex<=0&&s.disabled]}><Text style={s.white}>←</Text></Pressable><View style={{flex:1,minWidth:0}}><TeamSelector label="Fechas" value={activeDate} onChange={setDateSelection} options={dates.map(date=>({id:date,category:dateLabel(date),name:date===datePeriod(today)?'Actual':'Partidos'}))}/></View><Pressable accessibilityRole="button" accessibilityLabel="Fechas siguientes" disabled={dateIndex<0||dateIndex>=dates.length-1} onPress={()=>setDateSelection(dates[dateIndex+1])} style={[s.chip,(dateIndex<0||dateIndex>=dates.length-1)&&s.disabled]}><Text style={s.white}>→</Text></Pressable></View><Text style={s.muted}>Primero aparecen los partidos con resultado. Los resultados del fin de semana se mantienen hasta el lunes. Desde el martes aparece el siguiente intervalo de fechas.</Text>{!!error&&<Text style={s.warning}>{error}</Text>}{matches.map((match,index)=><View key={match.team.id+':'+match.id} style={{gap:10}}>{(index===0||matches[index-1].date!==match.date)&&<Text style={s.upcomingDate}>{match.date?match.date.split('-').reverse().join('/'):'Fecha por confirmar'}</Text>}<UpcomingMatchCard match={match} account={account} onEdited={editedResult}/></View>)}{!matches.length&&<Text style={s.muted}>No hay partidos publicados para estas fechas.</Text>}</>);

  const instagram=(<>
    {!ig.posts.length&&<Text style={s.muted}>{ig.error?'No se pudieron actualizar las fotos.':'Todavía no hay fotos disponibles.'}</Text>}
    {ig.posts.slice(0,8).filter(post=>post.images?.length).map(post=><Pressable key={post.id} accessibilityRole="link" accessibilityLabel="Abrir publicación de Instagram y ver más información" onPress={()=>Linking.openURL(instagramPostUrl(post)).catch(()=>setError('No se pudo abrir Instagram.'))} style={s.photo}>
      <CachedImage uri={post.images[0]} accessibilityLabel={post.caption||'Publicación de Villalbilla C.F.'} style={{width:'100%',aspectRatio:1}} resizeMode="contain"/>
    </Pressable>)}
  </>);

  return <View style={{gap:18,width:'100%',backgroundColor:appTheme.background}}>
    {mode==='results'?<><Text style={s.title}>Resultados</Text>{target?<NotificationMatch account={account} onEdited={editedResult} target={target} onClose={()=>setTarget(null)}/>:results}</>:<>
      <View style={{gap:5,paddingVertical:5}}><Text style={{color:'#fff',fontSize:30,fontWeight:'900'}}>Noticias</Text><View style={{height:3,width:105,borderRadius:3,backgroundColor:'#42c7ff'}}/></View>
      <View style={{gap:8,width:'100%'}}>
       {onOpenFantasy&&<FantasyNewsAccess onPress={onOpenFantasy}/>}
      </View>
      <ClubNewsSummary teams={news.teams}/>
      {instagram}
      {!!error&&<Text style={s.warning}>{error}</Text>}
      <FavoritePlayers favoritePlayerIds={favoritePlayerIds}/>
      <VisitCounter/>
      <SponsorCarousel/>
    </>}
  </View>;
}

const s=StyleSheet.create({
  scoreboard:{flexDirection:'row',alignItems:'center',gap:10},scoreSide:{flex:1,minWidth:0,alignItems:'center',gap:7},scoreTeam:{flex:1,minWidth:0,textAlign:'center'},
  dateNavigation:{flexDirection:'row',alignItems:'center',gap:8},disabled:{opacity:0.35},
  photo:{borderRadius:16,overflow:'hidden',backgroundColor:appTheme.background},
  title:{fontSize:32,lineHeight:38,fontWeight:'900',color:'#fff'},kicker:{fontSize:11,letterSpacing:1,color:appTheme.accent,fontWeight:'800'},muted:{fontSize:13,lineHeight:21,color:'#aab8cb'},row:{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},chip:{backgroundColor:appTheme.control,borderRadius:10,padding:12},active:{backgroundColor:'#b42122'},white:{color:'#fff',fontWeight:'700'},link:{color:appTheme.accent,fontWeight:'700',paddingVertical:8},card:{padding:20,borderRadius:20,backgroundColor:appTheme.panel,borderWidth:1,borderColor:appTheme.border,gap:13},heading:{color:'#fff',fontSize:18,fontWeight:'800'},warning:{color:'#ffc1c9',lineHeight:21},filter:{color:'#dce6f2',fontSize:10},team:{color:'#eaf0fa',fontSize:15,lineHeight:23,fontWeight:'600'},score:{color:'#50EBEC',fontWeight:'900',fontSize:25},match:{borderTopWidth:appTheme.lineWidth,borderColor:appTheme.accent,paddingTop:13,gap:10},upcomingCard:{backgroundColor:appTheme.panel,width:'100%',paddingVertical:15,paddingHorizontal:8,borderRadius:18,borderTopWidth:0,borderBottomWidth:0,borderColor:appTheme.accent,gap:10},upcomingDate:{color:appTheme.accent,fontSize:13,fontWeight:'700'},vs:{fontSize:11,color:'#ff9995',fontWeight:'900'},expandIcon:{fontSize:18,color:appTheme.accent},venueDetails:{borderTopWidth:appTheme.lineWidth,borderColor:appTheme.accent,paddingTop:13},
});
