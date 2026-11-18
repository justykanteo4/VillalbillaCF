import SettingsGroup from './SettingsGroup';
import FantasyAccessSettings from './FantasyAccessSettings';
import {ReleaseNotes} from './ReleaseStartup';
import {OfflineLibrarySettings} from './OfflineLibrary';
import Tutorial from './Tutorial';
import {destination} from './tutorial-navigation.cjs';
import {useScreenHistory} from './useBackNavigation';
import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {auth} from './firebase';
import NotificationsScreen from './NotificationsScreen';
import AccountVerification from './AccountVerification';
import PasswordSettings from './PasswordSettings';
import SavedCopies from './SavedCopies';
import {clearOfficialCopies} from './offline';
import {ManualUpdate} from './InternetUpdates';
import ClubDirectory from './ClubDirectory';
import AdminHub from './AdminHub';
export default function SettingsHub({account,teamIds=[],playerIds=[],onLogout,onNavigate,onOpenNotification}){
 const [cacheMessage,setCacheMessage]=useState('');
 const [page,sp,,back]=useScreenHistory(null,{priority:20,key:'settings:'+(account?.id||'guest')});const trainer=account?.status==='admin'||account?.status==='approved'&&account.claim?.role!=='player',password=auth?.currentUser?.providerData?.some(p=>p.providerId==='password');
 const groups=[
  ['Mi cuenta',[...(auth?.currentUser?[['verification','Verificar cuenta']]:[]),...(password?[['password','Cambiar contraseña']]:[])]],
  ['Avisos y ayuda',[['notifications','Notificaciones'],['tutorial','Tutorial']]],
  ['Datos y actualizaciones',[['storage','Datos descargados'],['reports','Actas guardadas'],['clear-sports','Limpiar caché deportiva'],['updates','Actualizar app']]],
  ...(trainer?[['Herramientas del club',[['players','Jugadores'],['coaches','Entrenadores']]]]:[]),
  ...(account?.status==='admin'?[['Administración',[['fantasy-access','Acceso a Fantasy'],['admin','Administración del club']]]]:[])
 ];
 const options=groups.flatMap(([,items])=>items);
 const canOpen=target=>target?.type==='settings'?options.some(([id])=>id===target.page)&&target.page!=='tutorial':!!destination(account,target);const openTarget=target=>{if(!canOpen(target))return;if(target.type==='settings')sp(target.page);else onNavigate?.(target)};
 return <View style={{gap:16}}>{page&&<Pressable accessibilityRole="button" onPress={()=>{if(!back())sp(null)}}><Text style={{color:'#91adff',padding:10}}>‹ Ajustes</Text></Pressable>}{!page?<><Text style={{fontSize:26,color:'#fff',fontWeight:'800'}}>Ajustes</Text>{groups.filter(([,items])=>items.length).map(([heading,items],index)=><SettingsGroup key={heading} title={heading} appearance="normal" initiallyOpen={index===0}>{items.map(([id,label])=><Pressable accessibilityRole="button" key={id} onPress={()=>sp(id)} style={{padding:13,backgroundColor:'#1b2e69',borderRadius:10}}><Text style={{color:'#fff',fontWeight:'600'}}>{label}</Text></Pressable>)}</SettingsGroup>)}</>:page==='tutorial'?<Tutorial account={account} canOpen={canOpen} onOpen={openTarget}/>:page==='notifications'?<NotificationsScreen onOpenDestination={onOpenNotification} admin={account?.status==='admin'} teamIds={teamIds} playerIds={playerIds}/>:page==='verification'?<AccountVerification/>:page==='password'&&password?<PasswordSettings/>:page==='storage'?<OfflineLibrarySettings/>:page==='reports'?<SavedCopies reportsOnly account={account}/>:page==='clear-sports'?<View style={{gap:14}}><Text style={{color:'#fff',fontSize:20,fontWeight:'800'}}>Caché deportiva</Text><Text style={{color:'#aab8cb'}}>Elimina las copias públicas de actas, jornadas y clasificaciones. No borra tu equipo, fotos, sesión ni ajustes.</Text><Pressable accessibilityRole="button" onPress={async()=>{try{await clearOfficialCopies();setCacheMessage('Caché deportiva eliminada. Los datos se descargarán al volver a consultar.')}catch{setCacheMessage('No se pudo limpiar la caché.')}}} style={{padding:16,backgroundColor:'#1b2e69',borderRadius:12}}><Text style={{color:'#fff',fontWeight:'800'}}>Limpiar caché deportiva</Text></Pressable>{!!cacheMessage&&<Text style={{color:'#aab8cb'}}>{cacheMessage}</Text>}</View>:page==='updates'?<><ManualUpdate/><ReleaseNotes/></>:page==='players'&&trainer?<ClubDirectory kind="players"/>:page==='coaches'&&trainer?<ClubDirectory kind="coaches"/>:page==='fantasy-access'&&account?.status==='admin'?<FantasyAccessSettings/>:page==='admin'&&account?.status==='admin'?<AdminHub account={account}/>:<Text style={{color:'#fff'}}>Esta opción no está disponible para tu cuenta.</Text>}{!page&&onLogout&&<Pressable accessibilityRole="button" onPress={onLogout} style={{padding:16,borderRadius:12,backgroundColor:'#40202b'}}><Text style={{color:'#ffc1c9'}}>Salir</Text></Pressable>}</View>;
}
