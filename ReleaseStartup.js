import {backgroundTurn,preferredStartupTeams} from './startup-work';
import React,{useEffect} from 'react';
import {AppState,View,Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notes from './release-notes.json';
import manifest from './bundled-data-manifest.json';
import {readBundledData} from './read-bundled-data';
import {installBundle} from './bundled-data-core.cjs';
import {readCopy,saveCopy,updateCopy} from './offline';
import {recordDiagnostic} from './diagnostics';
import {trackLocalSave} from './update-save-guard.cjs';
export default function ReleaseStartup({children}){
 useEffect(()=>{let stopped=false,running=false,done=false;const abort=new AbortController();
  async function prepare(){if(stopped||running||done||AppState.currentState!=='active')return;running=true;
   const work=(async()=>{try{if(!await backgroundTurn({delay:1200,signal:abort.signal}))return;if(await AsyncStorage.getItem('villalbilla.bundled-data.installed.v1')!==manifest.id){const bundle=await readBundledData();if(bundle.id!==manifest.id)throw Error('Copia incluida incorrecta');await installBundle(bundle,{readCopy,saveCopy,updateCopy,storage:AsyncStorage,preferredTeamIds:preferredStartupTeams(),yieldControl:async()=>{if(stopped||!await backgroundTurn({delay:150,signal:abort.signal}))throw Error('Importación pausada')}})}done=true}catch{if(!stopped&&AppState.currentState==='active')recordDiagnostic({category:'aplicacion',code:'FORMAT'})}finally{running=false}})();
   // Optional public data failures must not permanently block installing a newer app.
   await trackLocalSave('public-release-data',work);
  }
  const start=setTimeout(prepare,0),retry=setInterval(prepare,60000),sub=AppState.addEventListener('change',state=>{if(state==='active')void prepare()});return()=>{stopped=true;abort.abort();clearTimeout(start);clearInterval(retry);sub.remove()};
 },[]);
 return children;
}
export function ReleaseNotes(){return <View style={{gap:12}}><Text style={{color:'#fff',fontSize:20,fontWeight:'800'}}>Últimas novedades</Text><Text style={{color:'#91adff'}}>{notes.title} · {notes.id}</Text>{notes.changes.map(change=><Text key={change} style={{color:'#eaf0fa',lineHeight:23}}>• {change}</Text>)}<Text style={{color:'#aab8cb',lineHeight:22}}>Esta actualización incluye {manifest.reports} actas y {manifest.entries} archivos públicos. Los datos que aún no estaban publicados se completan cuando están disponibles.</Text></View>}
