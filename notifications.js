import AsyncStorage from '@react-native-async-storage/async-storage';
import {getRandomBytesAsync} from 'expo-crypto';
import {AppState} from 'react-native';
import {auth} from './firebase';
import {api} from './api';
import {registerPush} from './push';
import {saveCopy,readCopy} from './offline';
import {resolveDeviceTargets} from './notification-targets.cjs';
export const NOTIFICATION_KEY='villalbilla.notifications.v1';
let changes=Promise.resolve(),syncing=Promise.resolve();
async function readPreferences(){const raw=await AsyncStorage.getItem(NOTIFICATION_KEY);return raw?JSON.parse(raw):null}
export async function notificationPreferences(){await changes;return readPreferences()}
function changePreferences(change){
 const job=changes.then(async()=>{const previous=await readPreferences(),next=change(previous);if(next!==previous)await AsyncStorage.setItem(NOTIFICATION_KEY,JSON.stringify(next));return next});
 changes=job.catch(()=>{});return job;
}
export function saveNotificationPreferences(value){return changePreferences(()=>value)}
async function installationKey(){
 let key=await AsyncStorage.getItem('villalbilla.push-installation-key');
 if(!key){key=Array.from(await getRandomBytesAsync(32)).map(byte=>byte.toString(16).padStart(2,'0')).join('');await AsyncStorage.setItem('villalbilla.push-installation-key',key)}
 return key;
}
async function saveSubscription(value){
 await api('/api/push/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,teamIds:value.receiveTeams===false?[]:value.teamIds,playerIds:value.receivePlayers===false?[]:value.playerIds,installationKey:await installationKey()})});
}
function syncSavedPreferences(){
 const job=syncing.then(async()=>{
  const value=await notificationPreferences();if(!value?.pendingSync)return value;
  await saveSubscription(value);
  return changePreferences(current=>JSON.stringify(current)===JSON.stringify(value)?{...current,pendingSync:false}:current);
 });
 syncing=job.catch(()=>{});return job;
}
export async function enableNotifications(teamIds,playerIds){
 const push=await registerPush();
 await saveNotificationPreferences({...(await notificationPreferences()),enabled:true,teamIds,playerIds,teamSelection:'custom',playerSelection:'custom',...push,consentedAt:new Date().toISOString(),pendingSync:true});
 await syncSavedPreferences();return notificationPreferences();
}
export async function updateNotificationTargets(teamIds,playerIds){
 const next=await changePreferences(value=>value?{...value,...resolveDeviceTargets(value,teamIds,playerIds),pendingSync:!!(value.enabled||value.pendingSync)}:value);
 if(next?.pendingSync)await syncSavedPreferences();
}
export async function saveNotificationTeams(teamIds,playerIds,choices={}){
 const next=await changePreferences(previous=>({...previous,receiveTeams:choices.receiveTeams??previous?.receiveTeams??true,receivePlayers:choices.receivePlayers??previous?.receivePlayers??true,enabled:!!previous?.enabled,...resolveDeviceTargets({teamSelection:'custom',teamIds,playerSelection:'custom',playerIds},teamIds,playerIds),teamSelection:'custom',playerSelection:'custom',pendingSync:!!(previous?.enabled||previous?.pendingSync)}));
 if(next.pendingSync){try{await syncSavedPreferences()}catch{/* Retry with the saved selection when the app becomes active. */}}
 return notificationPreferences();
}
export async function disableNotifications(){
 await changePreferences(previous=>({...previous,enabled:false,pendingSync:true}));
 try{await syncSavedPreferences()}catch{/* The saved opt-out will be retried on return to the app. */}
 return notificationPreferences();
}
export function watchNotifications(callback,onError){
 let active=true,running=false;
 readCopy('Avisos').then(copy=>{if(active&&copy)callback(copy.data.messages)}).catch(()=>{});
 const refresh=async()=>{
  if(running||AppState.currentState==='background')return;running=true;
  const apply=data=>{if(active){callback(data.messages);saveCopy('Avisos',data).catch(()=>{})}};
  try{apply(await api('/api/notifications',{onUpdate:apply,onRefreshError:error=>{if(active)onError?.(error)}}))}catch(error){if(active)onError?.(error)}finally{running=false}
 };
 refresh();const timer=setInterval(refresh,60000),sub=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
 return()=>{active=false;clearInterval(timer);sub.remove()};
}
async function adminRequest(path,value={}){
 if(!auth?.currentUser)throw Error('Inicia sesión como administrador.');
 if(!auth.currentUser.emailVerified&&!auth.currentUser.providerData?.some(p=>p.providerId==='google.com'))throw Error('Verifica tu cuenta antes de enviar notificaciones.');
 const token=await auth.currentUser.getIdToken(true);
 return api(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(value)});
}
export async function sendClubNotification(value){return adminRequest('/api/push/send',value)}
export async function dispatchNotifications(){return adminRequest('/api/push/dispatch')}
