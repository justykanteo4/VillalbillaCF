import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX='villalbilla.rffm-cache.v1:';
const inflight=new Map();
const MAX_ITEMS=100;
const MAX_ITEM_CHARS=600000;
let writes=0;

function madridDay(now=Date.now()){
  return new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',weekday:'short'}).format(new Date(now));
}
function madridDate(now=Date.now()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const get=type=>parts.find(p=>p.type===type)?.value;
  return get('year')+'-'+get('month')+'-'+get('day');
}
function weekStart(date){
  const d=new Date(date+'T12:00:00Z');
  const day=d.getUTCDay();
  d.setUTCDate(d.getUTCDate()-(day+6)%7);
  return d.toISOString().slice(0,10);
}
function policy(path){
  if(/^\/api\/(?:players|team-roster)(?:\?|$)/.test(path))return 'weekly';
  if(/^\/api\/match(?:\?|$)/.test(path))return 'acta';
  if(/^\/api\/standings(?:\?|$)/.test(path))return 'standings';
  if(/^\/api\/news(?:\?|$)/.test(path))return 'calendar';
  // No guardar cuentas, sesiones, operaciones, fichajes, mercado ni información privada.
  return null;
}
function fresh(entry,type,now){
  if(!entry||!entry.savedAt)return false;
  if(type==='weekly')return weekStart(madridDate(entry.savedAt))===weekStart(madridDate(now));
  const day=madridDay(now),weekend=day==='Sat'||day==='Sun';
  if(!weekend)return true;
  const interval=type==='acta'||type==='standings'?15*60000:30*60000;
  return now-entry.savedAt<interval && now>=entry.savedAt;
}
async function prune(){
  try{
    const keys=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith(PREFIX));
    if(keys.length<=MAX_ITEMS)return;
    const records=await AsyncStorage.multiGet(keys);
    const ordered=records.map(([key,value])=>{
      try{return {key,time:JSON.parse(value)?.savedAt||0}}catch{return {key,time:0}}
    }).sort((a,b)=>a.time-b.time);
    await AsyncStorage.multiRemove(ordered.slice(0,keys.length-MAX_ITEMS).map(x=>x.key));
  }catch{}
}
export async function clearOfficialCache(){
  const keys=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith(PREFIX));
  if(keys.length)await AsyncStorage.multiRemove(keys);
}
export async function cachedOfficialGet(path,fetcher,{forceRefresh=false}={}){
  const type=policy(path);
  if(!type)return fetcher();
  const key=PREFIX+path;
  let saved=null;
  try{
    const raw=await AsyncStorage.getItem(key);
    if(raw)saved=JSON.parse(raw);
  }catch{}
  if(!forceRefresh&&fresh(saved,type,Date.now()))return saved.data;
  if(inflight.has(key))return inflight.get(key);
  const request=(async()=>{
    try{
      const data=await fetcher();
      // No reemplazar una copia correcta por una respuesta que indica error.
      if(data&&!data.error){
        try{
          const encoded=JSON.stringify({savedAt:Date.now(),data});
          if(encoded.length<=MAX_ITEM_CHARS){
            await AsyncStorage.setItem(key,encoded);
            if(++writes%20===0)prune();
          }
        }catch{}
      }
      if(data?.error&&saved?.data)return saved.data;
      return data;
    }catch(error){
      if(saved?.data)return saved.data;
      throw error;
    }finally{inflight.delete(key)}
  })();
  inflight.set(key,request);
  return request;
}
