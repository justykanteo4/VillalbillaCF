import AsyncStorage from '@react-native-async-storage/async-storage';
import {getRandomBytesAsync} from 'expo-crypto';
import {AppState} from 'react-native';
import {auth} from './firebase';
import {api} from './api';
import {registerPush} from './push';
import {saveCopy,readCopy} from './offline';
export const NOTIFICATION_KEY='villalbilla.notifications.v1';
export async function notificationPreferences(){const raw=await AsyncStorage.getItem(NOTIFICATION_KEY);return raw?JSON.parse(raw):null}
export async function saveNotificationPreferences(value){await AsyncStorage.setItem(NOTIFICATION_KEY,JSON.stringify(value))}
async function installationKey(){
 let key=await AsyncStorage.getItem('villalbilla.push-installation-key');
 if(!key){key=Array.from(await getRandomBytesAsync(32)).map(byte=>byte.toString(16).padStart(2,'0')).join('');await AsyncStorage.setItem('villalbilla.push-installation-key',key)}
 return key;
}
async function saveSubscription(value){
 await api('/api/push/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,installationKey:await installationKey()})});
}
export async function enableNotifications(teamIds,playerIds){
 const push=await registerPush();
 const value={enabled:true,teamIds,playerIds,...push,consentedAt:new Date().toISOString()};
 await saveSubscription(value);await saveNotificationPreferences(value);return value;
}
export async function updateNotificationTargets(teamIds,playerIds){
 const value=await notificationPreferences();if(!value?.enabled)return;
 const next={...value,teamIds,playerIds};await saveSubscription(next);await saveNotificationPreferences(next);
}
export async function disableNotifications(){
 await saveSubscription({enabled:false});await saveNotificationPreferences({enabled:false});
}
export function watchNotifications(callback,onError){
 let active=true,running=false;
 readCopy('Avisos').then(copy=>{if(active&&copy)callback(copy.data.messages)}).catch(()=>{});
 const refresh=async()=>{
  if(running||AppState.currentState==='background')return;running=true;
  try{const data=await api('/api/notifications');if(active){callback(data.messages);saveCopy('Avisos',data).catch(()=>{})}}catch(error){if(active)onError?.(error)}finally{running=false}
 };
 refresh();const timer=setInterval(refresh,60000),sub=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
 return()=>{active=false;clearInterval(timer);sub.remove()};
}
async function adminRequest(path,value={}){
 if(!auth?.currentUser)throw Error('Inicia sesión como administrador.');
 const token=await auth.currentUser.getIdToken();
 return api(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(value)});
}
export async function sendClubNotification(value){return adminRequest('/api/push/send',value)}
export async function dispatchNotifications(){return adminRequest('/api/push/dispatch')}
