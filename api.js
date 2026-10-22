import {Platform} from 'react-native';
export const apiBase=Platform.OS==='web'?'':(process.env.EXPO_PUBLIC_API_URL||'');
export async function api(path,options={}){
 if(Platform.OS!=='web'&&!apiBase)throw Error('Servicio pendiente de configurar para móvil');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);
 const abortFromCaller=()=>controller.abort();
 if(options.signal?.aborted)controller.abort();
 else options.signal?.addEventListener('abort',abortFromCaller,{once:true});
 try{
  const r=await fetch(apiBase+path,{...options,headers:{...options.headers,'X-App-Platform':Platform.OS},signal:controller.signal});
  const d=await r.json();
  if(!r.ok){const e=Error(d.error||'Servicio no disponible');e.status=r.status;throw e}
  return d;
 }catch(error){
  if(controller.signal.aborted&&!options.signal?.aborted)throw Error('La consulta tardó demasiado. Comprueba la conexión e inténtalo de nuevo.');
  throw error;
 }finally{
  clearTimeout(timeout);
  options.signal?.removeEventListener('abort',abortFromCaller);
 }
}
