import {api} from './api';
export async function inspectPushPermission(){return {granted:globalThis.Notification?.permission==='granted',channelBlocked:false,status:globalThis.Notification?.permission||'unavailable'}}
export const openPushSettings=async()=>{throw Error('En Chrome, abre los permisos de este sitio y permite las notificaciones.');};
export const onPushTokenChange=()=>()=>{};
export const testLocalNotification=async()=>{throw Error('La prueba del teléfono está disponible en la APK.');};
export async function registerPush({prompt=true}={}){
 if(!('Notification' in globalThis)||!navigator.serviceWorker||!('PushManager' in globalThis))throw Error('Para recibir avisos, instala la web en la pantalla de inicio y ábrela desde su icono. También puedes leerlos dentro de la app.');
 const permission=prompt?await Notification.requestPermission():Notification.permission;
 if(permission!=='granted')throw Error('El navegador no ha autorizado los avisos. Puedes cambiarlo en sus ajustes.');
 const {publicKey}=await api('/api/push/key');
 if(!publicKey)throw Error('Los avisos aún no están disponibles. Inténtalo más tarde.');
 await navigator.serviceWorker.register('/firebase-messaging-sw.js');
 const registration=await navigator.serviceWorker.ready;
 const base64=publicKey.replace(/-/g,'+').replace(/_/g,'/');
 const key=Uint8Array.from(atob(base64+'='.repeat((4-base64.length%4)%4)),char=>char.charCodeAt(0));
 let subscription=await registration.pushManager.getSubscription();
 if(subscription){const old=subscription.options.applicationServerKey;if(!old||Array.from(new Uint8Array(old)).join(',')!==Array.from(key).join(',')){await subscription.unsubscribe();subscription=null}}
 if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 return {provider:'web',subscription:subscription.toJSON()};
}
