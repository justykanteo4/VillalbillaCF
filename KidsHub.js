import React,{useState,useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KidsCrestGame from './KidsCrestGame';
import KidsPlayerCard from './KidsPlayerCard';
import KidsFootballChallenges from './KidsFootballChallenges';
import {View,Text,Pressable,StyleSheet,Image} from 'react-native';

const QUESTIONS=[
 {q:'¿Cuántos jugadores tiene un equipo en el campo al comenzar un partido?',options:['9','11','13'],correct:1},
 {q:'¿Qué tarjeta utiliza el árbitro para expulsar a un jugador?',options:['Roja','Azul','Verde'],correct:0},
 {q:'¿Cómo se llama el jugador que puede tocar el balón con las manos dentro de su área?',options:['Delantero','Portero','Extremo'],correct:1},
 {q:'¿Cuántos puntos consigue normalmente un equipo al ganar un partido?',options:['1','2','3'],correct:2}
];
const menu=[
 ['Noticias','📰'],['Resultados','⚽'],['Clasificaciones','🏆'],['Calendario','📅'],
 ['Goleadores','🥅'],['Rankings','🥇'],['Votaciones','🗳️']
];
function Tile({icon,title,subtitle,onPress}){return <Pressable accessibilityRole="button" onPress={onPress} style={s.tile}><Text style={s.tileIcon}>{icon}</Text><Text style={s.tileTitle}>{title}</Text>{subtitle&&<Text style={s.note}>{subtitle}</Text>}</Pressable>}
function Button({children,onPress,secondary=false}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.button,secondary&&s.secondary]}><Text style={s.buttonText}>{children}</Text></Pressable>}
export default function KidsHub({onOpenPublic,onExit}){
 const [screen,setScreen]=useState('inicio'),[goal,setGoal]=useState(null),[points,setPoints]=useState(0),[qIndex,setQIndex]=useState(0),[answer,setAnswer]=useState(null);
 useEffect(()=>{let active=true;AsyncStorage.getItem('villalbilla.kids-stars.v1').then(value=>{if(active&&value!==null)setPoints(Math.max(0,Math.min(9999,Number(value)||0)))}).catch(()=>{});return()=>{active=false}},[]);
 const award=n=>setPoints(p=>{const next=p+n;AsyncStorage.setItem('villalbilla.kids-stars.v1',String(next)).catch(()=>{});return next});
 const nextQuestion=()=>{setAnswer(null);setQIndex(i=>(i+1)%QUESTIONS.length)};
 const attempt=direction=>{if(goal!==null)return;const keeper=['Izquierda','Centro','Derecha'][Math.floor(Math.random()*3)];setGoal({direction,keeper,scored:direction!==keeper});if(direction!==keeper)award(1)};
 const selectAnswer=i=>{if(answer!==null)return;setAnswer(i);if(i===QUESTIONS[qIndex].correct)award(1)};
 return <View style={s.main}><View style={s.hero}><Image source={require('./assets/escudo-transparente.png')} style={{width:44,height:61}} resizeMode="contain"/><View style={{flex:1}}><Text style={s.kicker}>VILLALBILLA C.F.</Text><Text style={s.heading}>KIDS 🎮</Text><Text style={s.note}>Modo infantil · En construcción 🚧</Text></View><Text style={s.stars}>⭐ {points}</Text></View>
 {screen!=='inicio'&&<Button secondary onPress={()=>setScreen('inicio')}>← Volver a KIDS</Button>}
 {screen==='inicio'&&<><Text style={s.title}>¡Tu club, tu aventura!</Text><Text style={s.note}>Juegos sencillos y acceso a las secciones públicas de Hinchas. No se muestran herramientas de entrenador.</Text><View style={s.grid}>
 <Tile icon="🥅" title="Penaltis" subtitle="¡Juega!" onPress={()=>{setGoal(null);setScreen('penaltis')}}/>
 <Tile icon="🧠" title="Quiz futbolero" subtitle="¡Juega!" onPress={()=>{setQIndex(0);setAnswer(null);setScreen('quiz')}}/>
 <Tile icon="🃏" title="Mi carta" subtitle="Personalízala" onPress={()=>setScreen('carta')}/>
 <Tile icon="🛡️" title="Adivina el escudo" subtitle="¡Juega!" onPress={()=>setScreen('escudos')}/>
 <Tile icon="⚡" title="Regates" subtitle="4 niveles" onPress={()=>setScreen('regates')}/>
 <Tile icon="🧩" title="Táctica" subtitle="4 retos" onPress={()=>setScreen('tactica')}/>
 </View><Text style={s.title}>La afición del Villalbilla</Text><View style={s.grid}>{menu.map(([title,icon])=><Tile key={title} title={title} icon={icon} onPress={()=>onOpenPublic(title)}/>)}</View><Button secondary onPress={onExit}>Salir del modo KIDS</Button></>}
 {screen==='penaltis'&&<View style={s.panel}><Text style={s.big}>🥅 ⚽</Text><Text style={s.title}>¡Lanza el penalti!</Text><Text style={s.note}>Elige por dónde quieres tirar. El portero se moverá para intentar pararlo.</Text>{goal?<><Text style={s.result}>{goal.scored?'¡GOOOL! 🎉':'¡Paradón! 🧤'}</Text><Text style={s.note}>El portero eligió: {goal.keeper}</Text><Button onPress={()=>setGoal(null)}>Otro penalti</Button></>:<View style={s.directions}>{['Izquierda','Centro','Derecha'].map(d=><Pressable key={d} accessibilityRole="button" onPress={()=>attempt(d)} style={s.direction}><Text style={s.buttonText}>{d}</Text></Pressable>)}</View>}</View>}
 {screen==='quiz'&&<View style={s.panel}><Text style={s.kicker}>PREGUNTA {qIndex+1} DE {QUESTIONS.length}</Text><Text style={s.title}>{QUESTIONS[qIndex].q}</Text>{QUESTIONS[qIndex].options.map((option,i)=><Button key={option} secondary onPress={()=>selectAnswer(i)}>{option}{answer===i?' ✓':''}</Button>)}{answer!==null&&<><Text style={s.result}>{answer===QUESTIONS[qIndex].correct?'¡Correcto! 🌟':'¡Buen intento! 💪'}</Text><Text style={s.note}>Respuesta: {QUESTIONS[qIndex].options[QUESTIONS[qIndex].correct]}</Text><Button onPress={nextQuestion}>Siguiente pregunta</Button></>}</View>}
 {screen==='escudos'&&<KidsCrestGame onPoints={award}/>}
 {screen==='regates'&&<KidsFootballChallenges mode="regates" onPoints={award}/>}
 {screen==='tactica'&&<KidsFootballChallenges mode="tactica" onPoints={award}/>}
 {screen==='carta'&&<View style={s.panel}><KidsPlayerCard/></View>}
 
 <Text style={s.foot}>Zona KIDS en desarrollo · Juegos sin premios de dinero ni rankings infantiles públicos.</Text></View>
}
const s=StyleSheet.create({
 main:{gap:16,paddingBottom:24},hero:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#1a3066',padding:16,borderRadius:22,borderWidth:2,borderColor:'#f4c344'},kicker:{fontSize:11,color:'#80dcfa',fontWeight:'900',letterSpacing:1},heading:{fontSize:28,fontWeight:'900',color:'#fff'},stars:{fontSize:19,fontWeight:'900',color:'#ffe182'},title:{fontSize:23,color:'#fff',fontWeight:'900'},note:{color:'#c0d1e5',fontSize:13,lineHeight:20},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{width:'48%',flexGrow:1,minHeight:110,borderWidth:1,borderColor:'#5474b5',borderRadius:17,padding:14,backgroundColor:'#152744',gap:5},tileIcon:{fontSize:30},tileTitle:{color:'#fff',fontWeight:'900',fontSize:15},button:{backgroundColor:'#b72135',padding:14,borderRadius:14,alignItems:'center'},secondary:{backgroundColor:'#254477'},buttonText:{color:'#fff',fontWeight:'800',fontSize:14},panel:{backgroundColor:'#172a4b',padding:18,borderRadius:19,gap:15,borderWidth:1,borderColor:'#4b6b9e'},directions:{flexDirection:'row',flexWrap:'wrap',gap:8},direction:{flexGrow:1,backgroundColor:'#b72135',borderRadius:10,paddingVertical:16,paddingHorizontal:8,alignItems:'center'},big:{fontSize:48,textAlign:'center'},result:{fontSize:23,color:'#ffe182',fontWeight:'900',textAlign:'center'},construction:{fontSize:18,color:'#ffcd64',fontWeight:'900',textAlign:'center'},foot:{color:'#a1b7d3',fontSize:11,textAlign:'center'}
});
