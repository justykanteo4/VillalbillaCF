import {useEffect,useMemo,useState} from 'react';
import {AppState} from 'react-native';
import {api} from './api';
import {readCopy,saveCopy} from './offline';
import seed from './reinforcements-seed.json';
import {createReinforcementsLoader} from './reinforcements-loader.cjs';
import {reinforcementPlayers} from './roster-reinforcements.cjs';
const load=createReinforcementsLoader({directory:seed.directory,seed:seed.teams,readCopy,saveCopy,fetchCalendar:(teamId,force)=>api('/api/team-calendar?team='+teamId+(force?'&refresh=1':''),{cache:'reload'}),fetchReport:(teamId,id,force)=>api('/api/match?team='+teamId+'&match='+id+(force?'&refresh=1':''),{cache:force?'reload':'archive'})});
export default function useTeamReinforcements(teamId,enabled=true){const initial=id=>({teamId:id,players:reinforcementPlayers(seed.teams.find(t=>t.id===id)?.records||[]),partial:false}),[data,set]=useState(()=>initial(teamId)),[busy,sb]=useState(false),[retry,sr]=useState(0);useEffect(()=>{if(!teamId||!enabled)return;let active=true,running=false;set(initial(teamId));async function refresh(force=false){if(running)return;running=true;sb(true);try{await load(teamId,{force,onUpdate:value=>{if(active)set({...value,teamId})}})}finally{running=false;if(active)sb(false)}}refresh(retry>0);const timer=setInterval(()=>refresh(),300000),sub=AppState.addEventListener('change',value=>{if(value==='active')refresh()});return()=>{active=false;clearInterval(timer);sub.remove()}},[teamId,enabled,retry]);const visible=useMemo(()=>data.teamId===teamId?data:initial(teamId),[data,teamId]);return {...visible,busy,refresh:()=>sr(n=>n+1)}}
