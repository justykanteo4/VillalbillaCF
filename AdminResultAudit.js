import {SectionStack} from './AppDividers';
import appTheme from './app-theme';
import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';
import {auth} from './firebase';
import {api} from './api';
import teams from './teams.json';
import catalog from './fantasy-players.json';

const palette={text:'#dce6f2',muted:'#aab8cb',panel:'#151f2d',accent:'#91adff',error:'#ffc1c9'};
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const teamName=id=>{const team=teams.find(t=>t.id===id);return team?team.category+' · '+team.name:id};
const score=value=>Number.isInteger(value)?String(value):'—';
const playerNames=new Map(catalog.teams.flatMap(team=>team.players.map(player=>[String(player.id),player.name])));
const selectedPlayers=json=>{try{const ids=JSON.parse(json);return Array.isArray(ids)?ids.map(id=>playerNames.get(String(id))||String(id)).join(', ')||'Ninguno':'—'}catch{return '—'}};

export default function AdminResultAudit(){
 const [entries,setEntries]=useState([]),[mvpEntries,setMvpEntries]=useState([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[checked,setChecked]=useState(null);
 async function refresh(){
  setLoading(true);setError('');
  try{
   if(!auth.currentUser)throw Error('Inicia sesión para revisar el historial.');
   const uid=auth.currentUser.uid,token=await auth.currentUser.getIdToken();
   if(uid!==auth.currentUser?.uid)throw Error('La cuenta ha cambiado. Abre de nuevo la administración.');
   const [response,mvpResponse]=await Promise.all([
    api('/api/admin/result-edit-history',{headers:{Authorization:'Bearer '+token},cache:'no-store'}),
    api('/api/admin/club-mvp-audit',{headers:{Authorization:'Bearer '+token},cache:'no-store'})
   ]);
   setEntries(Array.isArray(response.history)?response.history:[]);
   setMvpEntries(Array.isArray(mvpResponse.history)?mvpResponse.history:[]);
   setChecked(new Date());
  }catch(e){setError(e.message||'No se pudo cargar el historial.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{refresh()},[]);
 const filtered=entries.filter(row=>normalize([row.actor_name,row.actor_email,row.match_id,teamName(row.team_id),row.action].join(' ')).includes(normalize(search.trim())));
 const filteredMvp=mvpEntries.filter(row=>normalize([row.actor_name,row.actor_role,row.match_id,teamName(row.team_id),selectedPlayers(row.player_ids),selectedPlayers(row.previous_player_ids)].join(' ')).includes(normalize(search.trim())));
 return <SectionStack style={{gap:14}}>
  <Text accessibilityRole="header" style={{color:palette.text,fontSize:24,fontWeight:'800'}}>Auditoría de resultados</Text>
  <Text style={{color:palette.muted,lineHeight:20}}>Últimas 100 correcciones de resultados y 100 cambios de MVP: autor, equipo, fecha y datos anteriores/nuevos. Solo visible para administradores.</Text>
  <TextInput accessibilityLabel="Buscar cambios deportivos" placeholder="Buscar equipo, partido o responsable" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} style={{backgroundColor:palette.panel,color:palette.text,borderRadius:10,padding:13}}/>
  <Pressable accessibilityRole="button" disabled={loading} onPress={refresh} style={{padding:14,backgroundColor:appTheme.selected,borderRadius:10,opacity:loading?0.5:1}}><Text style={{color:palette.text,fontWeight:'700'}}>{loading?'Consultando…':'Actualizar historial'}</Text></Pressable>
  {!!error&&<Text accessibilityRole="alert" style={{color:palette.error}}>{error}</Text>}
  {checked&&<Text style={{color:palette.muted}}>Última consulta: {checked.toLocaleString('es-ES')} · {filtered.length+filteredMvp.length} registros visibles</Text>}
  {!loading&&!filtered.length&&!filteredMvp.length&&<Text style={{color:palette.muted}}>{entries.length||mvpEntries.length?'No hay cambios para esta búsqueda.':'No hay correcciones registradas.'}</Text>}
  {filteredMvp.length>0&&<Text accessibilityRole="header" style={{color:palette.text,fontSize:18,fontWeight:'800'}}>Cambios de MVP</Text>}
  {filteredMvp.map(row=><View key={row.id} style={{backgroundColor:palette.panel,padding:14,borderRadius:12,gap:6}}>
   <Text style={{color:palette.text,fontWeight:'800'}}>{teamName(row.team_id)} · MVP</Text>
   <Text style={{color:palette.muted}}>Partido {row.match_id} · Revisión {row.new_revision} · {row.actor_role}</Text>
   <Text style={{color:palette.text}}>Antes: {selectedPlayers(row.previous_player_ids)}</Text>
   <Text style={{color:palette.text}}>Después: {selectedPlayers(row.player_ids)}</Text>
   <Text style={{color:palette.muted}}>{row.actor_name||row.actor_uid} · {new Date(row.created_at).toLocaleString('es-ES')}</Text>
  </View>)}
  {filtered.map(row=><View key={row.id} style={{backgroundColor:palette.panel,padding:14,borderRadius:12,gap:6}}>
   <Text style={{color:palette.text,fontWeight:'800'}}>{teamName(row.team_id)}</Text>
   <Text style={{color:palette.muted}}>Partido {row.match_id} · Revisión {row.revision}</Text>
   <Text style={{color:palette.text}}>{score(row.previous_home)} - {score(row.previous_away)} → {row.action==='restore'?'Resultado federativo':score(row.home_score)+' - '+score(row.away_score)}</Text>
   <Text style={{color:palette.muted}}>{row.actor_name||row.actor_uid} · {new Date(row.created_at).toLocaleString('es-ES')}</Text>
  </View>)}
 </SectionStack>;
}
