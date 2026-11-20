import FantasyAppearanceSettings from './FantasyAppearanceSettings';
import SettingsGroup from './SettingsGroup';
import PlayerViewPreference from './PlayerViewPreference';
import StartupScreenPreference from './StartupScreenPreference';
import ReportProblem from './ReportProblem';
import CalendarPreference from './CalendarPreference';
import FantasyAccessSettings from './FantasyAccessSettings';
import {ReleaseNotes} from './ReleaseStartup';
import {OfflineLibrarySettings} from './OfflineLibrary';
import Tutorial from './Tutorial';
import {destination} from './tutorial-navigation.cjs';
import {useScreenHistory} from './useBackNavigation';
import React,{useState} from 'react';
import {View,Text,Pressable,TextInput} from 'react-native';
import {auth} from './firebase';
import NotificationsScreen from './NotificationsScreen';
import AccountVerification from './AccountVerification';
import PasswordSettings from './PasswordSettings';
import SavedCopies from './SavedCopies';
import {clearOfficialCopies} from './offline';
import {ManualUpdate} from './InternetUpdates';
import ClubDirectory from './ClubDirectory';
import AdminHub from './AdminHub';
import ClubResultEditor from './ClubResultEditor';
export default function SettingsHub({account,teamIds=[],playerIds=[],onLogout,onNavigate,onOpenNotification}){
 const [logoutBusy,setLogoutBusy]=useState(false),[logoutError,setLogoutError]=useState('');
 async function logout(){
  if(logoutBusy||!onLogout)return;
  setLogoutBusy(true);setLogoutError('');
  try{await onLogout()}
  catch(e){setLogoutError(e?.message||'No se pudo cerrar la sesión. Comprueba la conexión e inténtalo de nuevo.')}
  finally{setLogoutBusy(false)}
 }
 const [cacheMessage,setCacheMessage]=useState('');
 const [search,setSearch]=useState('');
 const [page,sp,,back]=useScreenHistory(null,{priority:20,key:'settings:'+(account?.id||'guest')});const trainer=account?.status==='admin'||account?.status==='approved'&&account.claim?.role!=='player',password=auth?.currentUser?.providerData?.some(p=>p.providerId==='password');
 const groups=[
  ['Mis ajustes · Mi cuenta',[...(auth?.currentUser?[['verification','Verificar cuenta']]:[]),...(password?[['password','Cambiar contraseña']]:[])]],
  ['Mis ajustes · Apariencia',[['player-view','Vista de jugadores: tarjetas o lista'],['startup-screen','Pantalla de inicio'],['fantasy-appearance','Tema de Fantasy: claro, oscuro o automático']]],
  ['Mis ajustes · Avisos y ayuda',[['notifications','Notificaciones'],['calendar-preference','Preferencias de calendario'],['report-problem','Reportar un problema'],['tutorial','Tutorial']]],
  ['Mis ajustes · Datos y actualizaciones',[['storage','Datos descargados'],['reports','Actas guardadas'],['clear-sports','Limpiar caché deportiva'],['updates','Actualizar app']]],
  ...(trainer?[['Club · Herramientas deportivas',[['players','Jugadores'],['coaches','Entrenadores'],['results','Corregir resultados']]]]:[]),
  ...(account?.status==='admin'?[['Club · Administración y seguridad',[['fantasy-access','Acceso a Fantasy'],['admin','Administración del club']]]]:[])
 ];
 const options=groups.flatMap(([,items])=>items);
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
 const term=normalize(search.trim());
 const visibleGroups=groups.map(([heading,items])=>[heading,items.filter(([,label])=>!term||normalize(heading+' '+label).includes(term))]).filter(([,items])=>items.length);
 const canOpen=target=>target?.type==='settings'?options.some(([id])=>id===target.page)&&target.page!=='tutorial':!!destination(account,target);const openTarget=target=>{if(!canOpen(target))return;if(target.type==='settings')sp(target.page);else onNavigate?.(target)};
 return <View style={{gap:16,backgroundColor:'#000',width:'100%'}}>{page&&<Pressable accessibilityRole="button" onPress={()=>{if(!back())sp(null)}}><Text style={{color:'#91adff',padding:10}}>‹ Ajustes</Text></Pressable>}{!page?<><Text style={{fontSize:26,color:'#fff',fontWeight:'800'}}>Ajustes</Text><TextInput accessibilityLabel="Buscar ajustes" placeholder="Buscar ajustes…" placeholderTextColor="#aab8cb" value={search} onChangeText={setSearch} style={{backgroundColor:'#000',borderWidth:1,borderColor:'#454545',color:'#fff',padding:13,borderRadius:12}}/>{visibleGroups.map(([heading,items],index)=><SettingsGroup key={heading+':'+term} title={heading} appearance="normal" initiallyOpen={!!term||index===0}>{items.map(([id,label])=><Pressable accessibilityRole="button" key={id} onPress={()=>sp(id)} style={{padding:13,backgroundColor:'#1b1b1b',borderRadius:8,borderBottomWidth:1,borderColor:'#303030'}}><Text style={{color:'#fff',fontWeight:'600'}}>{label}</Text></Pressable>)}</SettingsGroup>)}</>:page==='player-view'?<PlayerViewPreference/>:page==='startup-screen'?<StartupScreenPreference account={account}/>:page==='fantasy-appearance'?<FantasyAppearanceSettings/>:page==='tutorial'?<Tutorial account={account} canOpen={canOpen} onOpen={openTarget}/>:page==='report-problem'?<ReportProblem/>:page==='calendar-preference'?<CalendarPreference/>:page==='notifications'?<NotificationsScreen onOpenDestination={onOpenNotification} admin={account?.status==='admin'} teamIds={teamIds} playerIds={playerIds}/>:page==='verification'?<AccountVerification/>:page==='password'&&password?<PasswordSettings/>:page==='storage'?<OfflineLibrarySettings/>:page==='reports'?<SavedCopies reportsOnly account={account}/>:page==='clear-sports'?<View style={{gap:14}}><Text style={{color:'#fff',fontSize:20,fontWeight:'800'}}>Caché deportiva</Text><Text style={{color:'#aab8cb'}}>Elimina las copias públicas de actas, jornadas y clasificaciones. No borra tu equipo, fotos, sesión ni ajustes.</Text><Pressable accessibilityRole="button" onPress={async()=>{try{await clearOfficialCopies();setCacheMessage('Caché deportiva eliminada. Los datos se descargarán al volver a consultar.')}catch{setCacheMessage('No se pudo limpiar la caché.')}}} style={{padding:16,backgroundColor:'#1b2e69',borderRadius:12}}><Text style={{color:'#fff',fontWeight:'800'}}>Limpiar caché deportiva</Text></Pressable>{!!cacheMessage&&<Text style={{color:'#aab8cb'}}>{cacheMessage}</Text>}</View>:page==='updates'?<><ManualUpdate/><ReleaseNotes/></>:page==='players'&&trainer?<ClubDirectory kind="players" account={account}/>:page==='coaches'&&trainer?<ClubDirectory kind="coaches" account={account}/>:page==='results'&&trainer?<ClubResultEditor account={account}/>:page==='fantasy-access'&&account?.status==='admin'?<FantasyAccessSettings/>:page==='admin'&&account?.status==='admin'?<AdminHub account={account}/>:<Text style={{color:'#fff'}}>Esta opción no está disponible para tu cuenta.</Text>}{!page&&onLogout&&<View style={{gap:10}}><Pressable accessibilityRole="button" accessibilityState={{disabled:logoutBusy}} disabled={logoutBusy} onPress={logout} style={{padding:16,borderRadius:12,backgroundColor:'#40202b',opacity:logoutBusy?0.65:1}}><Text style={{color:'#ffc1c9'}}>{logoutBusy?'Cerrando sesión…':'Salir'}</Text></Pressable>{!!logoutError&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{logoutError}</Text>}</View>}</View>;
}
