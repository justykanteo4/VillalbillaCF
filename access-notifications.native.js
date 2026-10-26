import * as Notifications from 'expo-notifications';
import {auth} from './firebase';
import {api} from './api';
import {registerPush} from './push';
export async function registerAccessPush({prompt=true}={}){
 const user=auth?.currentUser;if(!user)return false;
 if(!prompt&&(await Notifications.getPermissionsAsync()).status!=='granted')return false;
 const push=await registerPush();if(auth.currentUser?.uid!==user.uid)return false;const token=await user.getIdToken();
 await api('/api/access/push',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({token:push.token})});return true;
}
