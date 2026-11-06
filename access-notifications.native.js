import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from './firebase';
import {api} from './api';
import {registerPush} from './push';
let pending=Promise.resolve();
function serial(action){const work=pending.catch(()=>{}).then(action);pending=work.catch(()=>{});return work}
export function registerAccessPush({prompt=true,admin=false}={}){
 const user=auth?.currentUser;return serial(async()=>{
 if(!user||auth.currentUser?.uid!==user.uid)return false;
 if(!prompt&&(await Notifications.getPermissionsAsync()).status!=='granted')return false;
 const push=await registerPush();if(auth.currentUser?.uid!==user.uid)return false;
 const isAdmin=admin;if(auth.currentUser?.uid!==user.uid)return false;const token=await user.getIdToken();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{await api(isAdmin?'/api/access/admin-push':'/api/access/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({token:push.token}),signal:controller.signal})}finally{clearTimeout(timer)}
 await AsyncStorage.setItem('villalbilla.access-push.device',JSON.stringify({uid:user.uid,token:push.token}));return true;
 });
}
export function unregisterAccessPush(){const user=auth?.currentUser;return serial(async()=>{if(!user)return;const raw=await AsyncStorage.getItem('villalbilla.access-push.device');if(!raw)return;const device=JSON.parse(raw);if(device.uid!==user.uid)return;const token=await user.getIdToken(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{await api('/api/access/push/remove',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({token:device.token}),signal:controller.signal});await AsyncStorage.removeItem('villalbilla.access-push.device')}finally{clearTimeout(timer)}})}
