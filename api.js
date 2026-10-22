import {Platform} from 'react-native';
export const apiBase=Platform.OS==='web'?'':(process.env.EXPO_PUBLIC_API_URL||'');
export async function api(path,options={}){if(Platform.OS!=='web'&&!apiBase)throw Error('Servicio pendiente de configurar para móvil');const r=await fetch(apiBase+path,{...options,headers:{...options.headers,'X-App-Platform':Platform.OS},signal:AbortSignal.timeout(65000)});const d=await r.json();if(!r.ok){const e=Error(d.error||'Servicio no disponible');e.status=r.status;throw e};return d}
