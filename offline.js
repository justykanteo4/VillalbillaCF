import {createWebDeviceCache} from './web-device-cache.cjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

// Use the same registration for the offline shell and optional web push.
if(Platform.OS==='web'&&globalThis.navigator?.serviceWorker){
 const register=async()=>{
  try{
   const existing=await navigator.serviceWorker.getRegistration('/');
   const url=existing?.active?.scriptURL||'/firebase-messaging-sw.js';
   await navigator.serviceWorker.register(url);
  }catch{/* Browser without service workers: local data cache remains available. */}
 };
 if(globalThis.document?.readyState==='complete')register();else globalThis.addEventListener?.('load',register,{once:true});
}

const PREFIX='villalbilla.cache.v2.';
const memory=new Map(),reading=new Map();
function remember(key,value){memory.delete(key);memory.set(key,value);if(memory.size>32)memory.delete(memory.keys().next().value);return value}
async function legacySaveCopy(key,data){
 const value={key,savedAt:new Date().toISOString(),data};
 await AsyncStorage.setItem(PREFIX+key,JSON.stringify(value));
 return remember(key,value);
}
async function legacyReadCopy(key){
 if(memory.has(key))return remember(key,memory.get(key));
 if(reading.has(key))return reading.get(key);
 const work=(async()=>{const raw=await AsyncStorage.getItem(PREFIX+key);const value=raw?JSON.parse(raw):null;return memory.has(key)?memory.get(key):value?remember(key,value):null})().finally(()=>reading.delete(key));reading.set(key,work);return work;
}
async function legacyListCopies(){
 const keys=(await AsyncStorage.getAllKeys()).filter(key=>key.startsWith(PREFIX));
 const values=await AsyncStorage.multiGet(keys);
 return values.flatMap(([,raw])=>{try{return raw?[JSON.parse(raw)]:[]}catch{return []}}).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
}

const legacy={saveCopy:legacySaveCopy,readCopy:legacyReadCopy,listCopies:legacyListCopies};
const device=Platform.OS==='web'&&globalThis.caches&&globalThis.location?.origin?createWebDeviceCache({legacy,cacheStorage:globalThis.caches,origin:globalThis.location.origin}):legacy;
export const saveCopy=device.saveCopy,readCopy=device.readCopy,listCopies=device.listCopies;
