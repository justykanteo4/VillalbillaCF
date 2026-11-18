import React from 'react';
import {View,Text} from 'react-native';
import SettingsGroup from './SettingsGroup';
import FantasyAccessSettings from './FantasyAccessSettings';
import FantasyUserSettings from './FantasyUserSettings';
import FantasyGameSettings from './FantasyGameSettings';
import FantasyLeagueCreationSettings from './FantasyLeagueCreationSettings';
import FantasyLeagueReset from './FantasyLeagueReset';
import FantasyClauseSettings from './FantasyClauseSettings';
import FantasyAdminTransfer from './FantasyAdminTransfer';
import FantasyPointsSettings from './FantasyPointsSettings';
import FantasyPriceSettings from './FantasyPriceSettings';
import {Button,text} from './FantasyUI';

export default function FantasySettings({request,onBack,account}){
 const isAdmin=account?.status==='admin';
 return <View style={{gap:12}}>
  <Button secondary onPress={onBack}>‹ Volver a Fantasy</Button>
  <Text accessibilityRole="header" style={{...text,fontSize:24,fontWeight:'900'}}>Ajustes Fantasy</Text>
  <SettingsGroup title="Acceso y usuarios" subtitle="Permisos y participantes" initiallyOpen>
   <FantasyAccessSettings request={request}/>
   <FantasyUserSettings request={request}/>
  </SettingsGroup>
  {isAdmin&&<SettingsGroup title="Ligas" subtitle="Crear, cláusulas y reiniciar">
   <FantasyLeagueCreationSettings request={request}/>
   <FantasyClauseSettings request={request}/>
   <FantasyLeagueReset request={request}/>
  </SettingsGroup>}
  {isAdmin&&<SettingsGroup title="Puntuaciones" subtitle="Modificar puntos de los jugadores">
   <FantasyPointsSettings request={request}/>
  </SettingsGroup>}
  <SettingsGroup title="Premios y entrenadores" subtitle="MVP, once ideal y salarios">
   <FantasyGameSettings request={request}/>
  </SettingsGroup>
  {isAdmin&&<SettingsGroup title="Mercado" subtitle="Precios y traspasos">
   <FantasyPriceSettings key={account?.id} request={request} account={account}/>
   <FantasyAdminTransfer request={request}/>
  </SettingsGroup>}
 </View>;
}
