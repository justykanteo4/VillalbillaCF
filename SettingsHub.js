import {OfflineLibrarySettings} from './OfflineLibrary';
import AdminDiagnostics from './AdminDiagnostics';
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
import {ManualUpdate} from './InternetUpdates';
import ClubDirectory from './ClubDirectory';
import AdminHub from './AdminHub';
export default function SettingsHub({account,teamIds=[],playerIds=[],onLogout,onNavigate}){
 const [page,sp,,back]=useScreenHistory(null,{priority:20,key:'settings:'+(account?.id||'guest')});const trainer=account?.status==='admin'||account?.status==='approved'&&account.claim?.role!=='player',password=auth?.currentUser?.providerData?.some(p=>p.providerId==='password');
 const options=[['tutorial','Tutorial de la app · paso a paso'],['notifications','Notificaciones'],...(auth?.currentUser?[['verification','Verificar cuenta']]:[]),...(password?[['password','Cambiar contraseña']]:[]),['storage','Datos guardados en el dispositivo'],['reports','Actas guardadas en el móvil'],['updates','Actualizar app'],...(trainer?[['players','Visualizador de jugadores'],['coaches','Buscar entrenadores']]:[]),...(account?.status==='admin'?[['diagnostics','Errores y diagnóstico'],['admin','Administración']]:[])];
 const canOpen=target=>target?.type==='settings'?options.some(([id])=>id===target.page)&&target.page!=='tutorial':!!destination(account,target);const openTarget=target=>{if(!canOpen(target))return;if(target.type==='settings')sp(target.page);else onNavigate?.(target)};
 return <View style={{gap:16}}>{page&&<Pressable accessibilityRole="button" onPress={()=>{if(!back())sp(null)}}><Text style={{color:'#91adff',padding:10}}>‹ Ajustes</Text></Pressable>}{!page?<><Text style={{fontSize:26,color:'#fff',fontWeight:'800'}}>Ajustes</Text>{options.map(([id,label])=><Pressable accessibilityRole="button" key={id} onPress={()=>sp(id)} style={{padding:16,backgroundColor:'#1b2e69',borderRadius:12}}><Text style={{color:'#fff'}}>{label}</Text></Pressable>)}</>:page==='tutorial'?<Tutorial account={account} canOpen={canOpen} onOpen={openTarget}/>:page==='notifications'?<NotificationsScreen teamIds={teamIds} playerIds={playerIds}/>:page==='verification'?<AccountVerification/>:page==='password'&&password?<PasswordSettings/>:page==='storage'?<OfflineLibrarySettings/>:page==='reports'?<SavedCopies reportsOnly account={account}/>:page==='updates'?<ManualUpdate/>:page==='players'&&trainer?<ClubDirectory kind="players"/>:page==='coaches'&&trainer?<ClubDirectory kind="coaches"/>:page==='diagnostics'&&account?.status==='admin'?<AdminDiagnostics account={account}/>:page==='admin'&&account?.status==='admin'?<AdminHub account={account}/>:<Text style={{color:'#fff'}}>Esta opción no está disponible para tu cuenta.</Text>}{!page&&onLogout&&<Pressable accessibilityRole="button" onPress={onLogout} style={{padding:16,borderRadius:12,backgroundColor:'#40202b'}}><Text style={{color:'#ffc1c9'}}>Salir</Text></Pressable>}</View>;
}
