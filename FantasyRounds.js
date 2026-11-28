import FantasyOfficialMatches from './FantasyOfficialMatches';
import FantasyArchivedSeasons from './FantasyArchivedSeasons';
import {groupSeasonRounds,seasonSummary} from './fantasy-season-history.cjs';
import React,{useEffect,useMemo,useState} from 'react';
import {AppState,Pressable,Text,View} from 'react-native';
import {roundTables} from './fantasy-round-tables.cjs';
import {Button,ErrorText,panel,text,title,theme} from './FantasyUI';
export default function FantasyRounds({leagueId,request,teamId}){
 const [details,setDetails]=useState({}),[detailOpen,setDetailOpen]=useState(null),[detailLoading,setDetailLoading]=useState(null),[detailError,setDetailError]=useState(''),[record,setRecord]=useState(null),[selectedSeason,setSelectedSeason]=useState(null),[showSeasonRanking,setShowSeasonRanking]=useState(false),[open,setOpen]=useState(undefined),[error,setError]=useState(''),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;setLoading(true);setError('');const apply=data=>{if(current)setRecord({leagueId,data})};request('/leagues/'+leagueId+'/table',{cache:undefined,onCached:apply}).then(apply).catch(e=>{if(current)setError(e.message)}).finally(()=>{if(current)setLoading(false)});const refresh=()=>request('/leagues/'+leagueId+'/table',{onCached:apply}).then(apply).catch(()=>{}),timer=setInterval(()=>{if(AppState.currentState==='active')refresh()},300000),sub=AppState.addEventListener('change',s=>{if(s==='active')refresh()});return()=>{current=false;clearInterval(timer);sub.remove()}},[leagueId,retry]);
 useEffect(()=>{setOpen(undefined);setSelectedSeason(null);setShowSeasonRanking(false);setDetails({});setDetailOpen(null);setDetailError('')},[leagueId]);
 async function showParticipant(round,row){
  if(!row.memberId)return;
  const key=leagueId+':'+round.week+':'+row.memberId;
  if(detailOpen===key){setDetailOpen(null);return}
  setDetailOpen(key);setDetailError('');
  if(details[key])return;
  setDetailLoading(key);
  try{
   const result=await request('/leagues/'+leagueId+'/rounds/'+round.week+'/participants/'+encodeURIComponent(row.memberId),{cache:'reload'});
   setDetails(prev=>({...prev,[key]:result}));
  }catch(e){setDetailError(e.message||'No se pudo consultar el desglose de puntos.')}
  finally{setDetailLoading(current=>current===key?null:current)}
 }

 const data=record?.leagueId===leagueId?record.data:null,rounds=useMemo(()=>roundTables(data?.rows),[data?.rows]),seasons=useMemo(()=>groupSeasonRounds(rounds),[rounds]),activeSeason=seasons.some(s=>s.season===selectedSeason)?selectedSeason:seasons[0]?.season,visibleRounds=seasons.find(s=>s.season===activeSeason)?.rounds||[],historical=useMemo(()=>seasonSummary(data?.rows||[],activeSeason),[data?.rows,activeSeason]),expanded=open===undefined?visibleRounds[0]?.week:open,points=v=>v===null?'Sin puntuación':(v>0?'+':'')+v+' pts';
 return <View style={{gap:16}}><Text style={title}>Jornadas</Text>{(data?.partial||data?.pending>0)&&<Text style={{...text,color:theme.accent}}>Estadísticas pendientes · Puntos confirmados</Text>}{loading&&!data&&<Text style={text}>Cargando jornadas…</Text>}{data&&!rounds.length&&<Text style={text}>Todavía no hay jornadas puntuadas en esta liga.</Text>}{!!seasons.length&&<View style={panel}>
  <Text style={{...title,fontSize:19}}>Temporadas</Text>
  
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{seasons.map(entry=><Pressable key={entry.season} accessibilityRole="button" accessibilityState={{selected:activeSeason===entry.season}} onPress={()=>{setSelectedSeason(entry.season);setOpen(undefined);setDetailOpen(null)}} style={{padding:10,borderWidth:1,borderColor:activeSeason===entry.season?theme.accent:theme.border,borderRadius:9,backgroundColor:theme.header}}><Text style={{...text,color:activeSeason===entry.season?theme.accent:theme.text,fontWeight:'800'}}>{entry.season}</Text></Pressable>)}</View>
  <Button secondary onPress={()=>setShowSeasonRanking(v=>!v)}>{showSeasonRanking?'Ocultar clasificación de temporada':'Ver clasificación de temporada'}</Button>
  {showSeasonRanking&&historical.map(item=><View key={item.key} style={{flexDirection:'row',gap:10,borderTopWidth:1,borderColor:theme.border,paddingTop:9}}><Text style={{...text,color:theme.accent,minWidth:24,fontWeight:'900'}}>{item.rank}</Text><Text style={{...text,flex:1,fontWeight:item.me?'900':'600'}}>{item.nickname}{item.me?' · Tú':''}</Text><Text style={{...text,fontWeight:'900'}}>{item.points} pts</Text></View>)}
  {showSeasonRanking&&!historical.length&&<Text style={text}>Todavía no hay puntos confirmados esta temporada.</Text>}
 </View>}
 {visibleRounds.map(round=><View key={round.week} style={panel}><Pressable accessibilityRole="button" accessibilityLabel={'Jornada del '+new Date(round.date+'T12:00:00Z').toLocaleDateString('es-ES')} accessibilityState={{expanded:expanded===round.week}} onPress={()=>{setOpen(expanded===round.week?null:round.week);setDetailOpen(null)}} style={{gap:8,paddingVertical:4}}><View style={{flexDirection:'row',justifyContent:'space-between',gap:12}}><Text style={{...title,fontSize:19,flex:1}}>Jornada del {new Date(round.date+'T12:00:00Z').toLocaleDateString('es-ES')}</Text><Text style={{...text,color:theme.accent,fontSize:23}}>{expanded===round.week?'−':'+'}</Text></View><Text style={{...text,color:theme.muted,fontSize:12}}>{data?.prizeStatus?.find(p=>p.week===round.week)?.status==='paid'?'Jornada cerrada':data?.prizeStatus?.find(p=>p.week===round.week)?.status==='pending-awards'?'Pendiente de completar MVP':'Jornada en curso'}</Text><Text style={{...text,color:theme.accent,fontWeight:'800'}}>Tus puntos: {points(round.mine)}</Text></Pressable>{expanded===round.week&&round.rows.map(row=>{
 const key=leagueId+':'+round.week+':'+row.memberId,show=detailOpen===key,detail=details[key];
 return <View key={row.memberId||row.key} style={{borderTopWidth:1,borderColor:theme.border}}>
  <Pressable disabled={!row.memberId} accessibilityRole="button" accessibilityLabel={'Ver jugadores y puntos de '+row.nickname+' en esta jornada'} accessibilityState={{expanded:show}} onPress={()=>showParticipant(round,row)} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,minHeight:52}}>
   <Text style={{...text,color:theme.accent,fontWeight:'900',minWidth:23}}>{row.rank??'—'}</Text>
   <Text style={{...text,fontWeight:row.me?'900':'600',flex:1}}>{row.nickname}{row.me?' · Tú':''}</Text>
   <Text style={{...text,color:row.points<0?theme.negative:theme.accent,fontWeight:'900'}}>{points(row.points)}</Text>
   <Text style={{...text,color:theme.accent,fontSize:18}}>{show?'−':'+'}</Text>
  </Pressable>
  {show&&<View style={{gap:9,padding:12,marginBottom:9,borderRadius:10,backgroundColor:theme.header}}>
   <Text style={{...text,fontWeight:'800'}}>Puntos por jugador · {row.nickname}</Text>
   {detailLoading===key&&<Text style={text}>Cargando desglose…</Text>}
   {!!detailError&&!detail&&<ErrorText>{detailError}</ErrorText>}
   {detail&&<>
    {detail.players.length?detail.players.map(player=><View key={player.playerId} style={{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:5,borderBottomWidth:1,borderColor:theme.border}}>
     <View style={{flex:1,gap:2}}>
      <Text style={{...text,fontWeight:'700'}}>{player.name}{player.captain?' ©':''}</Text>
      <Text style={{...text,fontSize:12,color:theme.muted}}>{player.position||'Sin posición'} · {player.playedMatches?player.playedMatches+' partido(s)':'Sin minutos confirmados'}{player.captain?' · Capitán ×2':''}</Text>
     </View>
     <Text style={{...text,fontWeight:'900',color:player.points<0?theme.negative:theme.accent}}>{points(player.points)}</Text>
    </View>):<Text style={{...text,color:theme.muted}}>Este equipo no tiene un once válido registrado para esta jornada.</Text>}
    {detail.coaches.map(coach=><View key={coach.coachId} style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Text style={text}>Entrenador</Text><Text style={{...text,fontWeight:'800',color:theme.accent}}>{points(coach.points)}</Text></View>)}
    <Text style={{...text,fontWeight:'900',textAlign:'right'}}>Total: {points(detail.total)}</Text>
    {detail.partial&&<Text style={{...text,fontSize:12,color:theme.muted}}>Algunas actas contienen datos provisionales.</Text>}
   </>}
  </View>}
 </View>;
})}</View>)}<FantasyOfficialMatches teamId={teamId}/><FantasyArchivedSeasons leagueId={leagueId} request={request}/><ErrorText>{error}</ErrorText><Button secondary disabled={loading} onPress={()=>{setRetry(n=>n+1);request('/leagues/'+leagueId+'/table',{cache:'reload'}).then(data=>setRecord({leagueId,data})).catch(e=>setError(e.message))}}>{loading?'Actualizando jornadas…':'Actualizar jornadas'}</Button></View>;
}
