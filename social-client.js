import {auth} from './firebase';
import {api,apiBase} from './api';
export async function socialRequest(path,value,signal){
 const user=auth?.currentUser;if(!user||user.isAnonymous)throw Error('Inicia sesión con tu cuenta del club.');
 const token=await user.getIdToken();
 return api('/api/social/'+path,{method:value===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(value===undefined?{}:{body:JSON.stringify(value)}),signal});
}
export function chatUrl(teamId){
 const base=apiBase||(typeof location!=='undefined'?location.origin:'');
 if(!base)throw Error('El servicio para móvil está pendiente de configurar.');
 return base.replace(/^http/,'ws').replace(/\/$/,'')+'/api/social/chat?team='+encodeURIComponent(teamId);
}
