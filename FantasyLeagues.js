import {fantasyDisplayNames} from './fantasy-display-names.cjs';
import {observeFantasyPurchases} from './fantasy-purchase-events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createFantasyCache} from './fantasy-device-cache.cjs';
import {fantasyRefreshAge,fantasyCacheFresh} from './fantasy-refresh-policy.cjs';
const cachedFantasy=createFantasyCache({read:async key=>JSON.parse(await AsyncStorage.getItem(key)||'null'),save:async(key,data,savedAt=new Date().toISOString())=>AsyncStorage.setItem(key,JSON.stringify({data,savedAt})),maxAgeForPath:fantasyRefreshAge,isFresh:fantasyCacheFresh});
import {auth} from './firebase';
import {api} from './api';
export async function fantasyRequest(path,options={}){
 try{
  const user=auth?.currentUser;if(!user)throw Object.assign(Error('Inicia sesión con tu cuenta.'),{status:401});
  const uid=user.uid,{onCached,scope,...networkOptions}=options;
  const sameAccount=()=>{if(auth?.currentUser?.uid!==uid)throw Object.assign(Error('La cuenta ha cambiado. Vuelve a entrar en Fantasy.'),{status:401})};
  const data=await cachedFantasy(uid,path,{...options,onCached:value=>{sameAccount();onCached?.(fantasyDisplayNames(value))}},async()=>{
   sameAccount();const token=await user.getIdToken();sameAccount();if(!token)throw Object.assign(Error('Inicia sesión con tu cuenta.'),{status:401});
   const result=await api('/api/fantasy'+path,{...networkOptions,cache:'no-store',headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})}});sameAccount();if((options.method||'GET')==='GET')observeFantasyPurchases(uid,path,result);return result;
  });sameAccount();return fantasyDisplayNames(data);
 }catch(e){if(e.status)throw e;throw Error('No se pudo conectar con Fantasy. Comprueba tu conexión y vuelve a intentarlo.')}
}
export {default} from './FantasyArea';
