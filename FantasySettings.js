import React,{useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import SettingsGroup from './SettingsGroup';
import FantasyAccessSettings from './FantasyAccessSettings';
import FantasyUserSettings from './FantasyUserSettings';
import FantasyGameSettings from './FantasyGameSettings';
import FantasyLeagueCreationSettings from './FantasyLeagueCreationSettings';
import FantasyLeagueReset from './FantasyLeagueReset';
import FantasyClauseSettings from './FantasyClauseSettings';
import FantasyAdminTransfer from './FantasyAdminTransfer';
import FantasyPointsSettings from './FantasyPointsSettings';
import FantasyPlayerStatsEditor from './FantasyPlayerStatsEditor';
import FantasyPriceSettings from './FantasyPriceSettings';
import {Button,text,theme} from './FantasyUI';

export default function FantasySettings({request,onBack,account}){
 const isAdmin=account?.status==='admin';
 const [search,setSearch]=useState('');
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 const term=normalize(search.trim());
 const matches=keywords=>!term||normalize(keywords).includes(term);
 return <View style={{gap:12}}>
  <Button secondary onPress={onBack}>‹ Volver a Fantasy</Button>
  <Text accessibilityRole="header" style={{...text,fontSize:24,fontWeight:'900'}}>Ajustes Fantasy</Text>
  <TextInput accessibilityLabel="Buscar ajustes Fantasy" placeholder="Buscar ajustes Fantasy…" placeholderTextColor={theme.muted} value={search} onChangeText={setSearch} style={{backgroundColor:'#162544',borderWidth:1,borderColor:'#334667',color:'#fff',padding:13,borderRadius:12}}/>
  {matches("Acceso usuarios participantes permisos invitaciones")&&<SettingsGroup key={"access:"+term} title="Acceso y usuarios" subtitle="Permisos y participantes" initiallyOpen>
   <FantasyAccessSettings request={request}/>
   <FantasyUserSettings request={request}/>
  </SettingsGroup>}
  {isAdmin&&matches("Ligas crear reiniciar clausulas temporadas equipos plazas inscripciones")&&<SettingsGroup key={"leagues:"+term} initiallyOpen={!!term} title="Ligas" subtitle="Crear, cláusulas y reiniciar">
   <FantasyLeagueCreationSettings request={request}/>
   <FantasyClauseSettings request={request}/>
   <FantasyLeagueReset request={request}/>
  </SettingsGroup>}
  {isAdmin&&matches("Puntuaciones puntos goles asistencias tarjetas actas estadisticas victoria empate derrota MVP")&&<SettingsGroup key={"points:"+term} initiallyOpen={!!term} title="Puntuaciones" subtitle="Modificar puntos de los jugadores">
   <FantasyPointsSettings request={request}/>
   <FantasyPlayerStatsEditor request={request}/>
  </SettingsGroup>}
  {matches("Premios entrenadores MVP once ideal salarios bonificaciones")&&<SettingsGroup key={"awards:"+term} initiallyOpen={!!term} title="Premios y entrenadores" subtitle="MVP, once ideal y salarios">
   <FantasyGameSettings request={request}/>
  </SettingsGroup>}
  {isAdmin&&matches("Mercado precios traspasos fichajes clausulas ofertas subastas")&&<SettingsGroup key={"market:"+term} initiallyOpen={!!term} title="Mercado" subtitle="Precios y traspasos">
   <FantasyPriceSettings key={account?.id} request={request} account={account}/>
   <FantasyAdminTransfer request={request}/>
  </SettingsGroup>}
 </View>;
}
