import {readCopy,saveCopy} from './offline';
import {Platform} from 'react-native';
export const apiBase=Platform.OS==='web'?'':(process.env.EXPO_PUBLIC_API_URL||'');
const PUBLIC_DATA=/^\/api\/(?:news|club-stats|instagram|calendar|standings|scorers|league-scorers|players|team-roster|team-ranking|team-staff|player-minutes|match|sanctions|field|weather)(?:\?|$)/;
export async function api(path,options={}){
 if(Platform.OS!=='web'&&!apiBase)throw Error('Servicio pendiente de configurar para móvil');
 const cacheable=(options.method||'GET')==='GET'&&PUBLIC_DATA.test(path);
 const cached=cacheable?await readCopy(path).catch(()=>null):null;
 if(cached&&Platform.OS==='web'&&globalThis.navigator?.onLine===false)return {...cached.data,error:true,offline:true,savedAt:cached.savedAt};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),cached?8000:25000);
 const abortFromCaller=()=>controller.abort();
 if(options.signal?.aborted)controller.abort();
 else options.signal?.addEventListener('abort',abortFromCaller,{once:true});
 try{
  const r=await fetch(apiBase+path,{...options,headers:{...options.headers,'X-App-Platform':Platform.OS},signal:controller.signal});
  const d=await r.json();
  if(!r.ok){const e=Error(d.error||'Servicio no disponible');e.status=r.status;throw e}
  if(cacheable&&!d.error)await saveCopy(path,d).catch(()=>{});
  return d;
 }catch(error){
  if(cacheable&&!options.signal?.aborted&&(!error.status||error.status>=500)){
   if(cached)return {...cached.data,error:true,offline:true,savedAt:cached.savedAt};
  }
  if(controller.signal.aborted&&!options.signal?.aborted)throw Error('La consulta tardó demasiado. Comprueba la conexión e inténtalo de nuevo.');
  throw error;
 }finally{
  clearTimeout(timeout);
  options.signal?.removeEventListener('abort',abortFromCaller);
 }
}
