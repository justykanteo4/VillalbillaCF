import {auth} from './firebase';
import {api} from './api';
export async function fantasyRequest(path,options={}){try{const token=await auth?.currentUser?.getIdToken();if(!token)throw Object.assign(Error('Inicia sesión con tu cuenta.'),{status:401});return await api('/api/fantasy'+path,{...options,cache:'no-store',headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})}})}catch(e){if(e.status)throw e;throw Error('No se pudo conectar con Fantasy. Comprueba tu conexión y vuelve a intentarlo.')}}
export {default} from './FantasyArea';
