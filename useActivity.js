import {useEffect} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getRandomBytesAsync} from 'expo-crypto';
import {api} from './api';
const random=async()=>Array.from(await getRandomBytesAsync(32),v=>v.toString(16).padStart(2,'0')).join('');
let identity;
async function ids(){if(!identity)identity=(async()=>{let deviceId=await AsyncStorage.getItem('villalbilla.activity-device.v1');if(!deviceId){deviceId=await random();await AsyncStorage.setItem('villalbilla.activity-device.v1',deviceId)}return {deviceId,id:await random()}})().catch(e=>{identity=null;throw e});return identity}
export default function useActivity(role){useEffect(()=>{if(!['trainer','player','fan'].includes(role))return;let active=true,busy=false;const send=async()=>{if(!active||busy||AppState.currentState==='background')return;busy=true;try{const value=await ids();if(active)await api('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,role})})}catch{}finally{busy=false}};send();const timer=setInterval(send,60000),sub=AppState.addEventListener('change',v=>{if(v==='active')send()});return()=>{active=false;clearInterval(timer);sub.remove()}},[role])}
