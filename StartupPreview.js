import seed from './news-seed.json';
import React,{useEffect,useState} from 'react';
import {View,Text,ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {readCopy} from './offline';
import {prioritizeScreen} from './startup-work';
function recent(data,teamIds){const all=data?.teams||[],selected=teamIds.length?all.filter(t=>teamIds.includes(t.id)):all;return selected.flatMap(t=>(t.fixtures||[]).filter(m=>Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore)).map(m=>({...m,category:t.category}))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,3)}
export default function StartupPreview({teamIds=[]}){const [rows,set]=useState(()=>recent(seed,teamIds));useEffect(()=>{let active=true;const cancel=prioritizeScreen(teamIds);readCopy('/api/news').then(copy=>{if(!active)return;if(copy?.data?.teams)set(recent(copy.data,teamIds))}).catch(()=>{});return()=>{active=false;cancel()}},[teamIds.join(',')]);return <SafeAreaView style={{flex:1,backgroundColor:'#0b121d'}}><ScrollView contentContainerStyle={{padding:24,gap:18}}><Text style={{color:'#fff',fontSize:23,fontWeight:'800'}}>VILLALBILLA C.F.</Text><Text style={{color:'#aab8cb'}}>Comprobando tu sesión…</Text>{rows.map((m,i)=><View key={m.id+':'+i} style={{padding:18,borderRadius:16,backgroundColor:'#151f2d',gap:8}}><Text style={{color:'#aab8cb'}}>{m.category} · {m.date?.split('-').reverse().join('/')}</Text><Text style={{color:'#fff',fontWeight:'800'}}>{m.home} {m.homeScore} — {m.awayScore} {m.away}</Text></View>)}</ScrollView></SafeAreaView>}
