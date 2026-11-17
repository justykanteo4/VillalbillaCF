import React,{useEffect,useRef,useState} from 'react';
import {Text} from 'react-native';
import {text,theme} from './FantasyUI';
export default function FantasyMarketClock({closesAt,offset=0,disabled=false,onClose}){
 const [now,setNow]=useState(Date.now()),closed=useRef(null),callback=useRef(onClose);callback.current=onClose;
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 const seconds=closesAt?Math.max(0,Math.ceil((closesAt-now-offset)/1000)):null;
 useEffect(()=>{if(seconds===0&&!disabled&&closed.current!==closesAt){closed.current=closesAt;callback.current?.()}},[seconds,closesAt,disabled]);
 const label=seconds===null?'—:—:—':[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
 return <Text accessibilityLabel="Contador de cierre de mercado" style={{...text,fontVariant:['tabular-nums'],fontSize:26,fontWeight:'900',color:theme.accent}}>{label}</Text>;
}
