import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {pushRegistrationError} from './native-errors.cjs';
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
export async function registerPush(){
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('club',{name:'Avisos del club',importance:Notifications.AndroidImportance.HIGH});
 let permission=await Notifications.getPermissionsAsync();
 if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();
 if(permission.status!=='granted')throw Error('No has autorizado las notificaciones. Puedes activarlas desde los ajustes del dispositivo.');
 const projectId=Constants.expoConfig?.extra?.eas?.projectId||Constants.easConfig?.projectId;
 if(!projectId)throw Error('Falta configurar el proyecto de notificaciones.');
 try{return {provider:'expo',token:(await Notifications.getExpoPushTokenAsync({projectId})).data}}
 catch(error){throw Error(pushRegistrationError(error))}
}
