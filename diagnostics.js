import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {getRandomBytesAsync} from 'expo-crypto';
import {createDiagnostics} from './diagnostics-core.cjs';
const listeners=new Set();
export const diagnostics=createDiagnostics({storage:AsyncStorage,randomId:async()=>Array.from(await getRandomBytesAsync(16),b=>b.toString(16).padStart(2,'0')).join(''),onChange:()=>listeners.forEach(fn=>fn())});
export const watchDiagnostics=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
export function recordDiagnostic(event){if(String(event.resource||'').startsWith('/api/diagnostics')||String(event.resource||'').startsWith('/api/admin/diagnostics'))return;void diagnostics.record({...event,platform:Platform.OS}).catch(()=>{})}
