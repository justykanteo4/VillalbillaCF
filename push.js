import {Platform,Linking} from 'react-native';
import Constants from 'expo-constants';
import {pushRegistrationError} from './native-errors.cjs';
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
async function ensureClubChannel(){if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('club',{name:'Avisos del club',importance:Notifications.AndroidImportance.HIGH});}
export async function inspectPushPermission(){const permission=await Notifications.getPermissionsAsync(),channel=Platform.OS==='android'?await Notifications.getNotificationChannelAsync('club'):null;return {granted:permission.status==='granted',channelBlocked:channel?.importance===Notifications.AndroidImportance.NONE,status:permission.status}}
export const openPushSettings=()=>Linking.openSettings();
export function onPushTokenChange(callback){const subscription=Notifications.addPushTokenListener(callback);return ()=>subscription.remove()}
export async function testLocalNotification(){await ensureClubChannel();const permission=await inspectPushPermission();if(!permission.granted||permission.channelBlocked)throw Error('Activa los avisos del móvil antes de probarlos.');await Notifications.scheduleNotificationAsync({content:{title:'Prueba de avisos',body:'Este móvil puede mostrar los avisos de Villalbilla C.F.',sound:'default',data:{destination:{type:'section',section:'news'}}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:1,channelId:'club'}})}
export async function registerPush({prompt=true}={}){
 await ensureClubChannel();
 let permission=await Notifications.getPermissionsAsync();
 if(permission.status!=='granted'&&prompt)permission=await Notifications.requestPermissionsAsync();
 if(permission.status!=='granted')throw Error('Android no tiene autorizados los avisos de esta app. Abre los permisos del móvil y actívalos.');
 const state=await inspectPushPermission();if(state.channelBlocked)throw Error('El canal «Avisos del club» está bloqueado en Android. Abre los permisos del móvil y actívalo.');
 const projectId=Constants.expoConfig?.extra?.eas?.projectId||Constants.easConfig?.projectId;
 if(!projectId)throw Error('Falta configurar el proyecto de notificaciones.');
 try{return {provider:'expo',token:(await Notifications.getExpoPushTokenAsync({projectId})).data}}
 catch(error){throw Error(pushRegistrationError(error))}
}
