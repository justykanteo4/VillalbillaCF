import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {loadTeamCalendar} from './team-calendar';
import RffmCrest from './RffmCrest';
import teams from './teams.json';
import {safeCrestUrl} from './rffm-crests.cjs';
const text={color:'#dce6f2',lineHeight:22};
const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
function candidates(fixtures){
 const map=new Map();
 for(const m of fixtures||[])for(const side of ['home','away']){
  const name=m[side],uri=safeCrestUrl(m[side+'Crest']);
  if(name&&uri&&!/VILLALBILLA\s*C\.?F\.?/i.test(name)&&!map.has(normal(name)))map.set(normal(name),{name,uri});
 }
 return [...map.values()];
}
export default function KidsCrestGame({onPoints}){
 const [teamIndex,setTeamIndex]=useState(0),[options,setOptions]=useState([]),[round,setRound]=useState(0),[answer,setAnswer]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setBusy(true);setError('');loadTeamCalendar(teams[teamIndex].id,{onUpdate:v=>{if(alive&&candidates(v?.fixtures).length>=4)setOptions(candidates(v.fixtures))}}).then(v=>{if(alive){setOptions(candidates(v?.fixtures));setBusy(false)}}).catch(()=>{if(alive){setError('No se pudieron consultar los escudos federativos.');setBusy(false)}});return()=>{alive=false}},[teamIndex]);
 const question=useMemo(()=>{if(options.length<4)return null;const correct=options[round%options.length];const others=options.filter(x=>x.name!==correct.name).slice(0,3);const choices=[...others.slice(0,round%4),correct,...others.slice(round%4)];return {correct,choices}},[options,round]);
 const choose=name=>{if(answer!==null||!question)return;setAnswer(name);if(name===question.correct.name)onPoints?.(1)};
 const next=()=>{setRound(i=>i+1);setAnswer(null)};
 return <View style={{gap:14,padding:18,borderRadius:18,backgroundColor:'#172a4b'}}>
 <Text style={{...text,fontWeight:'900',fontSize:24}}>🛡️ Adivina el escudo</Text>
 <Text style={text}>Escudos oficiales de la RFFM, con preguntas individuales y sin rankings públicos.</Text>
 {busy&&<Text style={text}>Preparando escudos…</Text>}
 {!busy&&!question&&<><Text style={text}>{error||'Aún no hay suficientes escudos disponibles en esta categoría.'}</Text><Pressable accessibilityRole="button" onPress={()=>{setTeamIndex(i=>(i+1)%teams.length);setAnswer(null)}} style={{backgroundColor:'#254477',padding:12,borderRadius:10}}><Text style={text}>Probar otra categoría</Text></Pressable></>}
 {question&&<><View style={{alignItems:'center',gap:12,padding:15,backgroundColor:'#0b1830',borderRadius:15}}><RffmCrest key={question.correct.uri} uri={question.correct.uri} name="Equipo por descubrir" size={94}/><Text style={{...text,fontWeight:'800'}}>¿A qué equipo pertenece?</Text></View>{question.choices.map(x=><Pressable accessibilityRole="button" key={x.name} disabled={answer!==null} onPress={()=>choose(x.name)} style={{backgroundColor:answer===x.name?'#1d724f':'#254477',padding:13,borderRadius:12}}><Text style={{...text,fontWeight:'800'}}>{x.name}</Text></Pressable>)}{answer!==null&&<><Text style={{...text,color:'#ffdd80',fontWeight:'900'}}>{answer===question.correct.name?'¡Correcto! ⭐':'La respuesta era '+question.correct.name}</Text><Pressable accessibilityRole="button" onPress={next} style={{padding:14,backgroundColor:'#b72135',borderRadius:12}}><Text style={{...text,fontWeight:'900',textAlign:'center'}}>Siguiente escudo</Text></Pressable></>}</>}
 </View>
}
