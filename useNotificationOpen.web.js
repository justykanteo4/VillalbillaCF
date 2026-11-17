import {useState} from 'react';
import {destinationFromUrl,defaultDestination} from './notification-destination.cjs';
export default function useNotificationOpen(){
 const [value,setValue]=useState(()=>{const url=globalThis.location?.href;if(!url)return null;const u=new URL(url),destination=destinationFromUrl(url)||(u.searchParams.has('avisos')?defaultDestination:null);return destination?{id:u.searchParams.get('notice')||'web-notice',intent:{type:'club',destination}}:null});
 async function consume(id){const u=new URL(globalThis.location.href);for(const key of ['aviso','notice','avisos'])u.searchParams.delete(key);globalThis.history.replaceState(null,'',u.pathname+u.search+u.hash);setValue(old=>old?.id===id?null:old)}
 return [value,consume];
}
