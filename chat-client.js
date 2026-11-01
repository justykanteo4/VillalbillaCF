import {AppState} from 'react-native';
import {auth,syncChatPermission} from './firebase';
import {apiBase} from './api';
import {chatTeams} from './chat-core.cjs';
const params=(teamId,peerId)=>'?'+new URLSearchParams({team:teamId,...(peerId?{peer:peerId}:{})}).toString();
async function call(path,teamId,peerId,body){
 if(!auth?.currentUser)throw Object.assign(Error('Inicia sesión.'),{code:'permission-denied'});
 const token=await auth.currentUser.getIdToken(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{const response=await fetch(apiBase+'/api/chats/'+path+params(teamId,peerId),{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'No se pudo conectar al chat.'),{code:[401,403].includes(response.status)?'permission-denied':'unavailable'});return data}finally{clearTimeout(timer)}
}
export async function syncChatMembership(account,teamId){
 if(!chatTeams(account).includes(teamId))throw Error('Equipo no asignado.');
 await syncChatPermission(account,teamId);return call('members',teamId,null,{});
}
export function watchChatMembers(teamId,onData,onError){let active=true,busy=false;const refresh=async()=>{if(!active||busy||AppState.currentState&&AppState.currentState!=='active')return;busy=true;try{const data=await call('members',teamId);if(active)onData(data.members)}catch(e){if(active)onError?.(e)}finally{busy=false}};refresh();const timer=setInterval(refresh,30000);return()=>{active=false;clearInterval(timer)}}
export async function openDirectChat(teamId,peerId){await call('history',teamId,peerId);return peerId}
export function watchChatMessages(teamId,peerId,onData,onError){
 let active=true,socket,timer,foreground=!AppState.currentState||AppState.currentState==='active';
 const connect=async()=>{
  if(!active||!foreground)return;
  try{const history=await call('history',teamId,peerId);if(!active||!foreground)return;onData(history.messages);const {ticket}=await call('ticket',teamId,peerId,{});if(!active||!foreground)return;
   const base=apiBase||(globalThis.location?.origin||'');socket=new WebSocket(base.replace(/^http/,'ws')+'/api/chats/socket?ticket='+encodeURIComponent(ticket));
   socket.onmessage=event=>{if(!active||!foreground)return;try{const row=JSON.parse(event.data);if(row?.id)onData([row])}catch{}};
   socket.onclose=()=>{if(active&&foreground)timer=setTimeout(connect,1500)};
   socket.onerror=()=>{if(active)onError?.(Error('Sin conexión al chat.'))};
  }catch(e){if(active){onError?.(e);if(foreground&&e.code!=='permission-denied')timer=setTimeout(connect,5000)}}
 };
 const sub=AppState.addEventListener('change',state=>{foreground=state==='active';clearTimeout(timer);socket?.close();if(foreground)connect()});connect();return()=>{active=false;clearTimeout(timer);sub.remove();socket?.close()};
}
export function sendChatMessage(teamId,peerId,body,account,id){return call('send',teamId,peerId,{id,body})}
