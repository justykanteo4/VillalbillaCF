import {DividerView} from './AppDividers';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,AppState} from 'react-native';
import FantasyPackReveal from './FantasyPackReveal';
import {watchFantasyPurchases} from './fantasy-purchase-events';
import {onPushReceived} from './push';
import {Button,text,panel,theme} from './FantasyUI';
export default function FantasyPurchaseReceipt({request,onOpenLeague,accountId}){
 const [receipt,setReceipt]=useState(null),[minimized,setMinimized]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const alive=useRef(true),locked=useRef(false),pending=useRef(false),current=useRef(null);
 async function load(){if(pending.current||locked.current||current.current||AppState.currentState==='background')return;pending.current=true;try{const d=await request('/purchase-receipts');if(alive.current&&!current.current&&d.receipt){current.current=d.receipt;setReceipt(d.receipt);setMinimized(false)}}catch{/* El aviso pendiente vuelve a comprobarse al regresar; nunca bloquea la liga. */}finally{pending.current=false}}
 useEffect(()=>{alive.current=true;let debounce;const refresh=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{if(alive.current)load()},180)};load();const listener=AppState.addEventListener('change',state=>{if(state==='active')refresh()}),timer=setInterval(()=>{if(AppState.currentState==='active')load()},60000),stop=watchFantasyPurchases(accountId,refresh),stopPush=onPushReceived(n=>{if(n?.request?.content?.data?.destination?.type==='fantasy-offers')refresh()});return()=>{alive.current=false;clearTimeout(debounce);clearInterval(timer);listener.remove();stop();stopPush()}},[accountId]);
 async function seen(){const value=current.current;if(!value||locked.current)return;locked.current=true;setBusy(true);setError('');let saved=false;try{await request('/purchase-receipts/seen',{method:'POST',body:JSON.stringify({tradeId:value.id})});if(alive.current){current.current=null;setReceipt(null);setMinimized(false);onOpenLeague?.(value.leagueId);saved=true}}catch(e){if(alive.current)setError(e.message)}finally{locked.current=false;if(alive.current){setBusy(false);if(saved)await load()}}}
 if(!receipt)return null;
 if(minimized)return <DividerView style={{...panel,borderColor:theme.accent,marginBottom:14}}><Text style={{...text,fontWeight:'900',color:theme.accent}}>Tienes un fichaje pendiente de abrir</Text><Button onPress={()=>setMinimized(false)}>Abrir sobre de mi fichaje</Button></DividerView>;
 return <FantasyPackReveal key={receipt.id} mode="purchase" players={[{...receipt.player,id:receipt.playerId}]} leagueName={receipt.leagueName} paid={receipt.paid} auction={receipt.auction} busy={busy} error={error} onFinish={seen} onLater={()=>setMinimized(true)}/>;
}
