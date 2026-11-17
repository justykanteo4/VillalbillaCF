import {useEffect,useState,useRef} from 'react';
import {Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {notificationIntent} from './notification-open.cjs';
import {nativeFantasyDestination} from './notification-destination.cjs';
const KEY='villalbilla.notification-open.consumed.v1';
export default function useNotificationOpen(){const [value,set]=useState(null),current=useRef(null),sequence=useRef(0);useEffect(()=>{let active=true,openedFromLink=false;const apply=async response=>{if(!response||response.actionIdentifier!==Notifications.DEFAULT_ACTION_IDENTIFIER)return;openedFromLink=false;const turn=++sequence.current,id=response.notification.request.identifier+':'+response.actionIdentifier;if(await AsyncStorage.getItem(KEY).catch(()=>null)===id||!active||openedFromLink||turn!==sequence.current)return;const intent=notificationIntent(response.notification.request.content.data);if(!intent)return;current.current=id;set({id,intent})};const sub=Notifications.addNotificationResponseReceivedListener(apply);const turn=sequence.current;Notifications.getLastNotificationResponseAsync().then(response=>{if(sequence.current===turn)void apply(response)}).catch(()=>{});const openLink=url=>{
 const destination=nativeFantasyDestination(url);
 if(!active||!destination)return;
 openedFromLink=true;
 const id='fantasy-link:'+Date.now()+':'+(++sequence.current);
 current.current=id;
 set({id,intent:{type:'club',destination}});
};const link=Linking.addEventListener('url',({url})=>openLink(url));Linking.getInitialURL().then(url=>{if(!openedFromLink)openLink(url)}).catch(()=>{});return()=>{active=false;sub.remove();link.remove()}},[]);async function consume(id){await AsyncStorage.setItem(KEY,id).catch(()=>{});if(current.current===id){current.current=null;set(null)}}return [value,consume]}
