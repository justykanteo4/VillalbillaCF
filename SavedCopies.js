import {useBackAction} from './useBackNavigation';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';
import {listCopies} from './offline';
import teams from './teams.json';
const text={color:'#dce6f2',lineHeight:22};
function label(key){
 if(!key.startsWith('/api/'))return key;
 const [path,query]=key.split('?'),params=new URLSearchParams(query||''),team=teams.find(row=>row.id===params.get('team'));
 const names={notifications:'Avisos',news:'Noticias',instagram:'Instagram',standings:'Clasificación',players:'Plantilla','team-ranking':'Ranking','league-scorers':'Goleadores de la liga',scorers:'Goleadores del club',sanctions:'Sanciones',match:'Partido','team-roster':'Plantilla de asistencia','team-staff':'Cuerpo técnico',weather:'Tiempo',field:'Campo','player-minutes':'Ficha del jugador'};
 return (names[path.slice(5)]||'Consulta')+(team?' · '+team.category+' · '+team.name:'');
}
function Preview({data}){
 if(data.goals||data.cards)return <View style={{gap:12}}><Text style={text}>Acta {data.id} · {data.closed?'Cerrada':'Pendiente de cierre'}</Text><Text style={text}>{data.homeScore??'—'} — {data.awayScore??'—'}</Text><Text style={text}>{data.venue||'Campo no publicado'}</Text>{[['Goles',data.goals],['Tarjetas',data.cards],['Árbitros',data.referees]].map(([title,rows])=><View key={title}><Text style={{...text,fontWeight:'800'}}>{title}</Text>{(rows||[]).map((r,i)=><Text key={i} style={text}>{r.name} · {r.minute||r.role||''} {r.type||''} · {r.team||''}</Text>)}{!rows?.length&&<Text style={text}>Sin registros publicados.</Text>}</View>)}</View>;
 const fixture=row=><Text key={row.id} style={text}>{row.date||'Sin fecha'} · {row.home} {row.homeScore??'—'} – {row.awayScore??'—'} {row.away}</Text>;
 if(data.teams)return <View style={{gap:14}}>{data.teams.map(team=><View key={team.id} style={{gap:6}}><Text style={{...text,fontWeight:'800'}}>{team.category} · {team.name}</Text>{(team.fixtures||[]).map(fixture)}</View>)}</View>;
 if(data.posts)return <View style={{gap:12}}>{data.posts.slice(0,8).map(post=><Text key={post.id} style={text}>{post.caption||'Publicación de Instagram'}</Text>)}</View>;
 if(data.attendance)return <View style={{gap:12}}><Text style={text}>{data.team}</Text><Text style={text}>Asistencia</Text>{Object.entries(data.attendance).map(([day,entries])=><View key={day}><Text style={{...text,fontWeight:'800'}}>{day}</Text>{Object.entries(entries).map(([id,value])=><Text key={id} style={text}>{data.players?.find(player=>player.id===id)?.name||'Jugador'}: {value}</Text>)}</View>)}<Text style={text}>Material</Text>{(data.materials||[]).map(row=><Text key={row.id} style={text}>{row.qty} × {row.name} · {row.holder} · {row.returned?'Devuelto':'Pendiente'}</Text>)}</View>;
 const rows=data.players||data.rows||data.people||data.allSanctions||data.fixtures||[];
 return <View style={{gap:10}}>{!rows.length&&<Text style={text}>No hay registros en esta copia.</Text>}{rows.map((row,index)=>row.home?fixture(row):<View key={(row.id||index)+':'+index}><Text style={{...text,fontWeight:'700'}}>{row.position?row.position+' · ':''}{row.name}</Text><Text style={text}>{row.points!=null?row.points+' puntos · ':''}{row.goals!=null?row.goals+' goles · ':''}{row.reason||row.role||row.teamName||''}</Text></View>)}</View>;
}
export default function SavedCopies({account,reportsOnly=false}){
 const [copies,setCopies]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState('');
 useBackAction(()=>{setSelected(null);return true},40,!!selected);
 const refresh=()=>listCopies().then(rows=>setCopies(rows.filter(copy=>(!reportsOnly||copy.key.startsWith('/api/match?'))&&(!copy.key.startsWith('Vestuario ')||account?.status==='admin'||(account?.status==='approved'&&account?.claim?.role!=='player'&&copy.key==='Vestuario '+account.claim.teamId))))).catch(()=>setError('No se pudieron leer las copias de este dispositivo.'));
 useEffect(()=>{refresh()},[]);
 return <View style={{gap:16}}><Text style={{color:'#fff',fontSize:26,fontWeight:'800'}}>{reportsOnly?'Actas guardadas en este móvil':'Copias guardadas'}</Text><Text style={{color:'#aab8cb'}}>Última consulta de cada sección en este dispositivo. Puedes abrirla sin conexión.</Text><Pressable onPress={refresh}><Text style={{color:'#91adff'}}>Actualizar lista</Text></Pressable>{!!error&&<Text style={{color:'#ffc1c9'}}>{error}</Text>}{!copies.length&&<Text style={{color:'#aab8cb'}}>Todavía no hay copias. Se guardarán al consultar datos.</Text>}{copies.map(copy=><Pressable key={copy.key} accessibilityRole="button" accessibilityState={{expanded:selected?.key===copy.key}} onPress={()=>setSelected(selected?.key===copy.key?null:copy)} style={{padding:16,backgroundColor:'#151f2d',borderRadius:12,gap:6}}><Text style={{color:'#fff'}}>{label(copy.key)}{reportsOnly?' · Acta '+copy.data.id:''}</Text><Text style={{color:'#aab8cb'}}>{new Date(copy.savedAt).toLocaleString('es-ES')}</Text></Pressable>)}{selected&&<ScrollView style={{maxHeight:480}} nestedScrollEnabled><Preview data={selected.data}/></ScrollView>}</View>;
}
