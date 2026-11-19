import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';

const COLORS={bg:'#172a4b',card:'#244473',gold:'#ffe18a',text:'#eef5ff',muted:'#bed0e8',red:'#bd2741'};
const DRIBBLE_LEVELS=[
 {title:'Primer entrenamiento',prompt:'El cono está delante. ¿Por dónde puedes seguir?',choices:['Por la izquierda','Chocar con el cono','Salir del campo'],correct:0,hint:'¡Muy bien! Rodea los obstáculos y sigue controlando el balón.',icon:'🚩'},
 {title:'¡A regatear!',prompt:'Un defensa se acerca por la izquierda. ¿Qué haces?',choices:['Pararte y perder el balón','Girar hacia la derecha','Pasársela al rival'],correct:1,hint:'¡Buen cambio de dirección! Busca el espacio libre.',icon:'⚽'},
 {title:'Carrera final',prompt:'Llegas cerca de portería con un compañero libre. ¿Qué opción ayuda al equipo?',choices:['No mirar a nadie','Tirar desde cualquier sitio','Pasar al compañero desmarcado'],correct:2,hint:'¡Gran juego en equipo! Los pases también ganan partidos.',icon:'🥅'},
 {title:'El último cono',prompt:'¿Cómo es más fácil mantener el balón al regatear?',choices:['Toques cortos y controlados','Patadón sin mirar','Cerrar los ojos'],correct:0,hint:'¡Control perfecto! Ya has completado el circuito.',icon:'🏆'}
];
const TACTICS=[
 {title:'Un compañero está solo',question:'Tienes el balón y dos rivales te presionan. ¿Qué haces?',options:['Pasar al compañero libre','Regatear a los dos sin mirar','Lanzar fuera'],correct:0,why:'Ver al compañero libre permite conservar la pelota.'},
 {title:'Ayuda al defensa',question:'Tu equipo pierde el balón. ¿Qué decisión es mejor?',options:['Quedarte parado','Volver a defender y ayudar','Discutir'],correct:1,why:'Recuperar la posición ayuda a todo el equipo.'},
 {title:'Juego limpio',question:'Un rival se cae al suelo. ¿Cómo reaccionas?',options:['Burlarte','Seguir sin mirar','Comprobar que está bien'],correct:2,why:'Respetar y ayudar es parte del fútbol.'},
 {title:'El pase final',question:'Llegas al área y tu compañero está mejor colocado. ¿Qué eliges?',options:['Buscar el pase','Dar la espalda','Salir por la banda sin motivo'],correct:0,why:'Una buena asistencia puede ser tan importante como un gol.'}
];
function Choice({label,index,onPress,disabled,selected,correct}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={()=>onPress(index)} style={{padding:14,borderRadius:14,backgroundColor:selected?(correct?'#24674f':'#813344'):COLORS.card,borderWidth:1,borderColor:selected?'#e5d17c':'#45629e'}}><Text style={{color:COLORS.text,fontSize:15,fontWeight:'800'}}>{String.fromCharCode(65+index)}. {label}</Text></Pressable>}
export default function KidsFootballChallenges({mode,onPoints}){
 const [level,setLevel]=useState(0),[answer,setAnswer]=useState(null),[completed,setCompleted]=useState(false);
 const levels=mode==='regates'?DRIBBLE_LEVELS:TACTICS;
 const round=levels[level];
 const choices=round.choices||round.options;
 const choose=index=>{if(answer!==null||completed)return;setAnswer(index);if(index===round.correct)onPoints?.(1)};
 const next=()=>{if(level>=levels.length-1){setCompleted(true);return}setLevel(n=>n+1);setAnswer(null)};
 const restart=()=>{setLevel(0);setAnswer(null);setCompleted(false)};
 const button=(name,onPress)=><Pressable accessibilityRole="button" onPress={onPress} style={{padding:14,backgroundColor:COLORS.red,borderRadius:12,alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'900'}}>{name}</Text></Pressable>;
 return <View style={{backgroundColor:COLORS.bg,borderWidth:1,borderColor:'#4d7cb8',borderRadius:19,padding:17,gap:15}}>
  <Text style={{color:COLORS.gold,fontWeight:'900',fontSize:13}}>{mode==='regates'?'⚡ RETO DE REGATES':'🧠 PIZARRA TÁCTICA'} · NIVEL {level+1}/{levels.length}</Text>
  <View style={{height:10,borderRadius:8,backgroundColor:'#314669',overflow:'hidden'}}><View style={{width:((level+Number(completed))/levels.length*100)+'%',height:10,backgroundColor:'#eac24d'}}/></View>
  {completed?<><Text style={{fontSize:52,textAlign:'center'}}>🏆</Text><Text style={{color:COLORS.text,fontSize:25,fontWeight:'900',textAlign:'center'}}>¡Reto completado!</Text><Text style={{color:COLORS.muted,textAlign:'center'}}>Has practicado decisiones de fútbol y compañerismo. ¡Sigue así!</Text>{button('Volver a jugar',restart)}</>:<>
  <View style={{alignItems:'center',gap:7,padding:14,backgroundColor:'#10203a',borderRadius:15}}>
   <Text style={{fontSize:45}}>{round.icon||(mode==='regates'?'⚽':'🧩')}</Text>
   <Text style={{color:COLORS.text,fontSize:22,fontWeight:'900',textAlign:'center'}}>{round.title}</Text>
   <Text style={{color:COLORS.muted,fontSize:15,lineHeight:22,textAlign:'center'}}>{round.prompt||round.question}</Text>
  </View>
  {choices.map((c,i)=><Choice key={i} label={c} index={i} onPress={choose} disabled={answer!==null} selected={answer===i} correct={i===round.correct}/>)}
  {answer!==null&&<><Text accessibilityRole="alert" style={{color:COLORS.gold,fontSize:17,fontWeight:'900'}}>{answer===round.correct?'¡Excelente! ⭐':'¡Buen intento! 💪'}</Text><Text style={{color:COLORS.muted,lineHeight:22}}>{round.hint||round.why}{answer!==round.correct?' La respuesta adecuada era: '+choices[round.correct]+'.':''}</Text>{button(level===levels.length-1?'Terminar el reto':'Siguiente nivel',next)}</>}
  </>}
  <Text style={{color:COLORS.muted,fontSize:11}}>Juego educativo individual · Sin premios reales ni clasificaciones públicas.</Text>
 </View>
}
