import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,TextInput} from 'react-native';
import TeamSelector from './TeamSelector';
import teams from './teams.json';
import seed from './news-seed.json';
import {api} from './api';
import {sections,destinationLabel,normalizeDestination} from './notification-destination.cjs';
import {hasResult,resultTeamName} from './result-dates.cjs';
const text={color:'#dce6f2',lineHeight:22},button={padding:12,borderRadius:12,backgroundColor:'#25364c'};
export default function NotificationDestinationPicker({value,onChange,disabled=false}){
 const [news,setNews]=useState(seed),[search,setSearch]=useState(''),[all,setAll]=useState(false);
 useEffect(()=>{let active=true;const apply=value=>{if(active&&value.teams?.length)setNews(value)};api('/api/news',{onUpdate:apply}).then(apply).catch(()=>{});return()=>{active=false}},[]);
 const match=value.type==='match',teamId=value.teamId||teams[0].id,team=news.teams.find(t=>t.id===teamId)||teams.find(t=>t.id===teamId);
 const label=m=>resultTeamName(m.home,m.homeId,team)+' '+(hasResult(m)?m.homeScore+' — '+m.awayScore:'vs')+' '+resultTeamName(m.away,m.awayId,team)+' · '+(m.date||'Fecha pendiente');
 const rows=[...(team?.fixtures||[])].sort((a,b)=>Number(hasResult(b))-Number(hasResult(a))||String(b.date||'').localeCompare(String(a.date||''))).filter(m=>label(m).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))),selected=team?.fixtures?.find(m=>String(m.id)===value.matchId);
 return <View pointerEvents={disabled?'none':'auto'} style={{gap:12,padding:14,borderWidth:1,borderColor:'#34475e',borderRadius:12}}><Text style={{...text,fontWeight:'800'}}>Al pulsar el aviso, abrir</Text><TeamSelector label="Destino del aviso" value={match?'match':value.section} onChange={id=>{setSearch('');setAll(false);onChange(id==='match'?{type:'match',teamId,matchId:''}:{type:'section',section:id})}} options={[...sections.map(([id,category])=>({id,category,name:''})),{id:'match',category:'Un partido concreto',name:''}]}/>{match&&<><TeamSelector label="Equipo del partido" value={teamId} onChange={id=>{setSearch('');setAll(false);onChange({type:'match',teamId:id,matchId:''})}} options={teams}/><TextInput accessibilityLabel="Buscar partido del aviso" placeholder="Rival o fecha" placeholderTextColor="#91a5be" value={search} onChangeText={setSearch} style={{...text,padding:12,borderWidth:1,borderColor:'#34475e',borderRadius:10}}/>{(all?rows:rows.slice(0,12)).map(m=><Pressable key={m.id} accessibilityRole="radio" accessibilityState={{selected:String(m.id)===value.matchId}} disabled={disabled} onPress={()=>onChange({type:'match',teamId,matchId:String(m.id)})} style={{...button,backgroundColor:String(m.id)===value.matchId?'#1b2e69':'#25364c'}}><Text style={text}>{String(m.id)===value.matchId?'✓ ':''}{label(m)}</Text></Pressable>)}{rows.length>12&&<Pressable accessibilityRole="button" onPress={()=>setAll(!all)} style={button}><Text style={text}>{all?'Ver menos partidos':'Ver todos los partidos'}</Text></Pressable>}{!rows.length&&<Text style={text}>No hay partidos para esta búsqueda.</Text>}</>}<Text style={{...text,color:normalizeDestination(value)?'#8ce2a8':'#ffc1c9'}}>{normalizeDestination(value)?'Destino: '+(selected?label(selected):destinationLabel(value)):'Elige el partido que abrirá el aviso.'}</Text></View>;
}
