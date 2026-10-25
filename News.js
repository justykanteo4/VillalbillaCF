import React,{useState,useEffect,useRef} from 'react';
import {View,Text,Pressable,Image,StyleSheet,AppState,ScrollView,Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from './api';
import seed from './news-seed.json';
import MatchSummary,{buildSummary} from './MatchSummary';
import VenueDirections from './VenueDirections';
import MatchWeather from './MatchWeather';
import FavoritePlayers from './FavoritePlayers';
import ClubNewsSummary from './ClubNewsSummary';

const dayKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function week(offset){
  const start=new Date(new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'})+'T12:00:00');
  start.setDate(start.getDate()-(start.getDay()+6)%7+offset*7);
  const end=new Date(start);end.setDate(start.getDate()+6);
  return {start:dayKey(start),end:dayKey(end),label:`${start.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} — ${end.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}`};
}

function UpcomingMatchCard({match}){
  const [expanded,setExpanded]=useState(false);
  return <View style={s.upcomingCard}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={'Detalles del partido entre '+match.home+' y '+match.away} onPress={()=>setExpanded(value=>!value)} style={{gap:9}}>
      <View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.kicker}>{match.team.category} · JORNADA {match.round}</Text><Text style={s.expandIcon}>{expanded?'−':'+'}</Text></View>
      <Text style={s.upcomingDate}>{match.date.split('-').reverse().join('/')} · {match.time||'Hora por confirmar'}</Text>
      <Text style={s.team}>{match.home}</Text><Text style={s.vs}>VS</Text><Text style={s.team}>{match.away}</Text>
      <MatchWeather compact fieldId={match.venueId} date={match.date} time={match.time}/>
      <Text style={s.link}>{expanded?'Ocultar detalles':'Ver campo y cómo llegar'} →</Text>
    </Pressable>
    {expanded&&<View style={s.venueDetails}><VenueDirections fieldId={match.venueId} venue={match.venue}/></View>}
  </View>;
}

export default function News({mode='news',favoriteTeamIds=[],favoritePlayerIds=[],favoritesOnly=false}){
  const [news,setNews]=useState(seed),[ig,setIg]=useState({connected:false,posts:[]}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[offset,so]=useState(0),[team,st]=useState('Todos');
  const alive=useRef(true),inFlight=useRef(false),summaries=useRef(new Map()),variants=useRef([]);
  const [summary,setSummary]=useState(null);

  function openSummary(match){
    const key=match.team.id+':'+match.id+':'+match.homeScore+':'+match.awayScore;
    if(!summaries.current.has(key)){
      if(!variants.current.length)variants.current=[0,1,2,3,4,5].sort(()=>Math.random()-.5);
      summaries.current.set(key,buildSummary(match,variants.current.pop()));
    }
    setSummary({match,text:summaries.current.get(key)});
  }

  async function refresh(){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);
    const [results,photos]=await Promise.allSettled([api('/api/news'),api('/api/instagram')]);
    if(alive.current){
      if(results.status==='fulfilled'){setNews(results.value);setError('');AsyncStorage.setItem('villalbilla.public.news',JSON.stringify(results.value)).catch(()=>{})}
      else setError('No se pudo actualizar. Mostramos la última información disponible.');
      if(photos.status==='fulfilled')setIg(photos.value);else setIg(value=>({...value,error:true}));
      setBusy(false);
    }
    inFlight.current=false;
  }

  useEffect(()=>{
    alive.current=true;
    AsyncStorage.getItem('villalbilla.public.news').then(value=>{if(value&&alive.current){const stored=JSON.parse(value);if(Array.isArray(stored.teams)&&!inFlight.current)setNews(stored)}}).catch(()=>{});
    refresh();const timer=setInterval(refresh,300000),subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
    return()=>{alive.current=false;clearInterval(timer);subscription.remove()};
  },[]);

  const favoriteSet=new Set(favoriteTeamIds),orderedTeams=[...news.teams].sort((a,b)=>Number(favoriteSet.has(b.id))-Number(favoriteSet.has(a.id))||a.category.localeCompare(b.category,'es'));
  const availableTeams=favoritesOnly?orderedTeams.filter(item=>favoriteSet.has(item.id)):orderedTeams;
  const range=week(offset),activeTeam=availableTeams.some(item=>item.id===team)?team:'Todos',selected=availableTeams.filter(item=>activeTeam==='Todos'||item.id===activeTeam);
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'});
  const upcomingMatches=selected.flatMap(item=>item.fixtures
    .filter(match=>match.date&&match.date>=today&&!(typeof match.homeScore==='number'&&typeof match.awayScore==='number'))
    .map(match=>({...match,team:item})))
    .sort((a,b)=>Number(favoriteSet.has(b.team.id))-Number(favoriteSet.has(a.team.id))||a.date.localeCompare(b.date)||(a.time||'99:99').localeCompare(b.time||'99:99'))
    .slice(0,3);

  const results=(<>
    <View style={s.card}>
      <Text style={s.heading}>La jornada del club</Text>
      <View style={[s.row,{justifyContent:'space-between'}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Semana anterior" onPress={()=>so(offset-1)} style={s.chip}><Text style={s.white}>←</Text></Pressable>
        <Text style={s.white}>{range.label}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Semana siguiente" onPress={()=>so(offset+1)} style={s.chip}><Text style={s.white}>→</Text></Pressable>
      </View>
      <Text style={s.muted}>Fuente: RFFM · Temporada 2026/27. Actualización automática cada 5 minutos mientras consultas esta sección.</Text>
      {news.checkedAt&&<Text style={s.muted}>Última consulta: {new Date(news.checkedAt).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}</Text>}
      {!!error&&<Text style={s.warning}>{error}</Text>}
    </View>
    <View style={s.row}>
      <Pressable style={[s.chip,activeTeam==='Todos'&&s.active]} onPress={()=>st('Todos')}><Text style={s.white}>Todos</Text></Pressable>
      {availableTeams.map(item=><Pressable key={item.id} style={[s.chip,activeTeam===item.id&&s.active]} onPress={()=>st(item.id)}><Text style={s.filter}>{favoriteSet.has(item.id)?'★ ':''}{item.category.replace('VILLALBILLA','')} {item.name.match(/'([^']+)'/)?.[1]||''}</Text></Pressable>)}
    </View>
    {!availableTeams.length&&<Text style={s.muted}>{news.teams.length?'No hay equipos favoritos seleccionados. Añade alguno en Ajustes.':'Cargando los equipos del club…'}</Text>}
    {selected.map(item=>{
      const matches=item.fixtures.filter(match=>match.date&&match.date>=range.start&&match.date<=range.end);
      return <View style={s.card} key={item.id}>
        <Text style={s.kicker}>{item.category}</Text><Text style={s.heading}>{item.name}</Text>
        {item.error&&<Text style={s.warning}>La consulta de este equipo ha fallado. {item.updatedAt?'Datos conservados del '+new Date(item.updatedAt).toLocaleDateString('es-ES'):'Sin datos disponibles.'}</Text>}
        {!matches.length&&<Text style={s.muted}>{item.error?'No se puede confirmar si hay partido.':'Sin partido publicado para esta semana.'}</Text>}
        {matches.map(match=><View style={s.match} key={match.id}>
          <Text style={s.muted}>Jornada {match.round} · {match.date.split('-').reverse().join('/')} {match.time||''}</Text>
          <Text style={s.team}>{match.home}</Text>
          <Text style={s.score}>{match.homeScore!==null&&match.awayScore!==null?`${match.homeScore} — ${match.awayScore}`:'Pendiente de resultado'}</Text>
          <Text style={s.team}>{match.away}</Text>
        </View>)}
      </View>;
    })}
    <View style={s.card}>
      <Text style={s.heading}>Próximos partidos</Text>
      <Text style={s.muted}>El tiempo aparece junto a cada encuentro. Toca un partido para consultar el campo y abrir la ruta.</Text>
      {!upcomingMatches.length&&<Text style={s.muted}>No hay próximos partidos publicados para esta selección.</Text>}
      {upcomingMatches.map(match=><UpcomingMatchCard key={match.team.id+':'+match.id} match={match}/>)}
    </View>
  </>);

  const instagram=(<>
    <View style={s.card}>
      <Text style={s.kicker}>INSTAGRAM · @VILLALBILLACF</Text><Text style={s.heading}>El club en imágenes</Text>
      {!ig.connected&&<Text style={s.muted}>Estamos preparando las publicaciones del club. Falta autorizar la cuenta de Instagram para mostrar automáticamente sus fotos aquí.</Text>}
      {ig.error&&<Text style={s.warning}>Instagram no está disponible ahora. {ig.posts.length?'Se mantiene la última consulta.':''}</Text>}
      {ig.connected&&!ig.posts.length&&<Text style={s.muted}>No hay publicaciones disponibles.</Text>}
    </View>
    {ig.posts.slice(0,8).map(post=><View key={post.id} style={s.card}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator accessibilityLabel="Fotos de la publicación; desliza para ver más">{post.images.map((url,index)=><Image key={index} source={{uri:url}} accessibilityLabel={(post.caption||'Foto de Villalbilla C.F.')+' · '+(index+1)+' de '+post.images.length} style={{width:280,height:280,borderRadius:12,marginRight:8}} resizeMode="contain"/>)}</ScrollView>{post.images.length>1&&<Text style={s.muted}>Desliza para ver las {post.images.length} fotos →</Text>}{(post.permalink?.startsWith('https://www.instagram.com/')||post.permalink?.startsWith('https://instagram.com/'))&&<Pressable accessibilityRole="link" onPress={()=>Linking.openURL(post.permalink).catch(()=>setError('No se pudo abrir Instagram.'))}><Text style={s.link}>Ver publicación en Instagram ↗</Text></Pressable>}
      <Text style={s.muted}>{new Date(post.date).toLocaleDateString('es-ES')}</Text><Text style={s.team}>{post.caption}</Text>
    </View>)}
  </>);

  const highlights=availableTeams.flatMap(item=>item.fixtures
    .filter(match=>match.date&&match.date>=range.start&&match.date<=range.end&&match.homeScore!==null&&match.awayScore!==null)
    .map(match=>({...match,team:item})))
    .sort((a,b)=>Number(favoriteSet.has(b.team.id))-Number(favoriteSet.has(a.team.id))||b.date.localeCompare(a.date));

  return <View style={{gap:18}}>
    <MatchSummary entry={summary} onClose={()=>setSummary(null)}/>
    {mode==='results'?<><Text style={s.title}>Resultados</Text>{results}<FavoritePlayers favoritePlayerIds={favoritePlayerIds}/></>:<>
      <ClubNewsSummary teams={news.teams} range={range}/>
      {instagram}<Text style={s.heading}>Los partidos de la jornada</Text><Text style={s.muted}>{range.label}</Text>
      {!!error&&<Text style={s.warning}>{error}</Text>}
      {!highlights.length&&<View style={s.card}><Text style={s.muted}>Todavía no hay resultados publicados para esta semana.</Text></View>}
      {highlights.map(match=><Pressable accessibilityRole="button" accessibilityLabel={'Leer resumen: '+match.home+' contra '+match.away} onPress={()=>openSummary(match)} style={s.card} key={match.team.id+':'+match.id}>
        <Text style={s.kicker}>{match.team.category}</Text><Text style={s.heading}>{match.home}</Text><Text style={s.score}>{match.homeScore} — {match.awayScore}</Text><Text style={s.heading}>{match.away}</Text>
        <Text style={s.muted}>Jornada {match.round} · {match.date.split('-').reverse().join('/')}</Text>
        {match.comment&&<Text style={[s.team,{borderTopWidth:1,borderColor:'#2d3e52',paddingTop:14}]}>{match.comment}</Text>}
        {match.team.error&&<Text style={s.warning}>Actualización pendiente: mostramos el último resultado disponible.</Text>}
        <Text style={s.link}>Leer resumen →</Text>
      </Pressable>)}
      <FavoritePlayers favoritePlayerIds={favoritePlayerIds}/>
    </>}
  </View>;
}

const s=StyleSheet.create({
  title:{fontSize:32,lineHeight:38,fontWeight:'900',color:'#fff'},kicker:{fontSize:11,letterSpacing:1,color:'#91adff',fontWeight:'800'},muted:{fontSize:13,lineHeight:21,color:'#aab8cb'},row:{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},chip:{backgroundColor:'#25364c',borderRadius:10,padding:12},active:{backgroundColor:'#b42122'},white:{color:'#fff',fontWeight:'700'},link:{color:'#91adff',fontWeight:'700',paddingVertical:8},card:{padding:20,borderRadius:20,backgroundColor:'#151f2d',borderWidth:1,borderColor:'#2d3e52',gap:13},heading:{color:'#fff',fontSize:18,fontWeight:'800'},warning:{color:'#ffc1c9',lineHeight:21},filter:{color:'#dce6f2',fontSize:10},team:{color:'#eaf0fa',fontSize:15,lineHeight:23,fontWeight:'600'},score:{color:'#91adff',fontWeight:'900',fontSize:25},match:{borderTopWidth:1,borderColor:'#2d3e52',paddingTop:13,gap:10},upcomingCard:{backgroundColor:'#0b121d',padding:15,borderRadius:15,borderWidth:1,borderColor:'#2d3e52',gap:10},upcomingDate:{color:'#91adff',fontSize:13,fontWeight:'700'},vs:{fontSize:11,color:'#ff9995',fontWeight:'900'},expandIcon:{fontSize:18,color:'#91adff'},venueDetails:{borderTopWidth:1,borderColor:'#2d3e52',paddingTop:13},
});
