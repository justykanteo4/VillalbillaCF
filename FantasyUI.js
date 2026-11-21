import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,TextInput} from 'react-native';
import theme from './fantasy-theme.cjs';
import FantasyAnimatedPressable from './FantasyAnimatedPressable';
export {theme};
export const text={color:theme.text,lineHeight:22},panel={paddingVertical:14,paddingHorizontal:8,gap:12,borderRadius:0,backgroundColor:'#000',borderTopWidth:1,borderBottomWidth:1,borderColor:'#303030'},title={...text,fontSize:22,fontWeight:'900'},input={padding:12,borderRadius:8,borderWidth:1,borderColor:'#454545',color:theme.text,backgroundColor:'#000'};
export function applyFantasyPalette(palette){
 Object.assign(theme,palette);
 Object.assign(text,{color:theme.text});
 Object.assign(panel,{backgroundColor:'#000',borderColor:'#303030'});
 Object.assign(title,{color:theme.text});
 Object.assign(input,{borderColor:'#454545',color:theme.text,backgroundColor:'#000'});
}
export const money=cents=>(cents/100).toLocaleString('es-ES',{maximumFractionDigits:2})+' M';
export function Button({children,onPress,disabled=false,secondary=false}){return <FantasyAnimatedPressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding:12,borderRadius:10,backgroundColor:secondary?'#171717':theme.button,opacity:disabled?0.45:1,borderWidth:secondary?1:0,borderColor:theme.border}}><Text style={{...text,textAlign:'center',fontWeight:'800',color:secondary?theme.text:theme.buttonText}}>{children}</Text></FantasyAnimatedPressable>}
export function ErrorText({children}){return children?<Text accessibilityRole="alert" style={{...text,color:theme.negative}}>{children}</Text>:null}
export function Field({label,value,onChange,number=false}){return <View style={{gap:5}}><Text style={text}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={number?'decimal-pad':'default'} placeholderTextColor={theme.muted} style={input}/></View>}
const rules = [
  ['Plantilla y alineación', [
    'Empiezas con 14 jugadores gratis, de valor bajo y sin TOP, y 52 M de saldo.',
    'Tu plantilla debe tener entre 12 y 16 jugadores. Alinea a 11.',
    'Guarda el once, la formación y el capitán hasta el viernes a las 23:59 (Madrid). Se desbloquean el lunes para la siguiente jornada.',
    'Las alineaciones guardadas conservan sus puntos. Consulta el detalle de cada jornada. Los partidos con acta pendiente puntúan cuando se confirma.',
  ]],
  ['Puntos de los jugadores', [
    'Victoria +6 · Empate +5 · Derrota +4 · Gol +1.',
    'Portería a cero: +1 al portero que juega el partido completo y a cada defensa que haya jugado.',
    'Gol en propia puerta −1 · Amarilla −1 · Doble amarilla −3 en total · Roja directa −4.',
  ]],
  ['MVP, once ideal y capitán', [
    'El club elige al menos 3 MVP de cada equipo ganador entre todos los convocados, incluidos los suplentes que no jugaron. Cada MVP suma 1 punto.',
    'El once ideal se elige entre los MVP. Cobras 1 M por cada elegido que hayas alineado, o 2 M si era tu capitán. Este premio solo suma dinero.',
    'El capitán duplica sus puntos positivos, negativos y premios. Deben pasar 6 jornadas antes de volver a elegir al mismo jugador.',
  ]],
  ['Entrenador y cuerpo técnico', [
    'El entrenador, cuerpo técnico o delegado suma +2 por victoria y +1 por empate de cada equipo a su cargo.',
    'Una o varias amarillas en el mismo partido restan 1 punto en total. Una roja resta 3. La capitanía no multiplica estos puntos.',
    'El sueldo se fija al contratar y se paga cada lunes desde el siguiente a la elección. Puedes cambiar de entrenador tras un mes.',
    'Máximo 2 M por semana. Se calcula con votos (60 %), resultados (40 %) y un suplemento por llevar varios equipos.',
  ]],
  ['Premios de jornada', [
    '1.º: 10 M · 2.º: 8 M · 3.º: 6 M · Resto: 5 M. Si hay empate, se comparte el puesto y el premio.',
    'Estos premios sustituyen los 2 M semanales. Se pagan al confirmar los resultados y al menos tres MVP de cada partido ganado.',
    'El pago se hace al cerrar la jornada. Los ajustes por resultados pendientes se ven en Transacciones.',
  ]],
  ['Mercado y fichajes', [
    'El mercado ofrece 16 jugadores y repone los comprados o caducados. Cada semana añade un TOP si hay alguno libre. Los demás refuerzos son jugadores sin TOP.',
    'En Ventas puedes ver a los jugadores vendidos durante una semana. Esos jugadores no ocupan plazas del mercado. Cada futbolista tiene un solo dueño por liga.',
    'Pujas hasta las 23:59 (Madrid). Gana la puja válida más alta. Si hay empate, gana la primera. Sin pujas, el anuncio dura hasta 7 días.',
    'Puedes pujar con el saldo disponible. El importe queda retenido hasta que retires la puja o termine la subasta. Las plazas y fichajes se comprueban al adjudicar.',
    'Máximo 2 fichajes por semana y 1 oferta enviada al día por liga, aunque se rechace o cancele. Las ofertas no retienen saldo. Al aceptarlas se comprueban fondos y límites de ambas plantillas.',
  ]],
];

export function FantasyRules({request}){
  const [points,setPoints]=useState(null);
  useEffect(()=>{if(!request)return;let active=true;request('/leagues',{cache:'reload'}).then(data=>{if(active)setPoints(data.leagues?.[0]?.settings?.points||null)}).catch(()=>{});return()=>{active=false}},[request]);
  const sections=rules.map(([heading,items])=>{
   if(!points)return [heading,items];
   if(heading==='Puntos de los jugadores')return [heading,[
    'Victoria '+points.win+' · Empate '+points.draw+' · Derrota '+points.loss+' · Gol '+points.goal+'.',
    'Portería a cero: portero con partido completo y defensas que hayan jugado '+points.cleanSheet+'.',
    'Gol en propia puerta '+points.ownGoal+' · Amarilla '+points.yellow+' · Doble amarilla '+points.secondYellow+' · Roja '+points.red+'.'
   ]];
   if(heading==='MVP, once ideal y capitán')return [heading,items.map(item=>item.replace('Cada MVP suma 1 punto.','Cada MVP suma '+points.mvp+' puntos.'))];
   return [heading,items];
  });
  return <View style={panel}>
    <Text accessibilityRole="header" style={title}>Reglas de VillalbillaFantasy</Text>
    {sections.map(([heading,items])=><View key={heading} style={{gap:7,borderTopWidth:1,borderColor:theme.border,paddingTop:12}}>
      <Text accessibilityRole="header" style={{...text,color:theme.accent,fontSize:16,fontWeight:'800'}}>{heading}</Text>
      {items.map(item=><View key={item} style={{flexDirection:'row',gap:8}}>
        <Text style={{...text,color:theme.accent}}>•</Text>
        <Text style={{...text,flex:1}}>{item}</Text>
      </View>)}
    </View>)}
  </View>;
}
