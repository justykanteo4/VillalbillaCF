import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import FantasyTrading from './FantasyTrading';
import theme from './fantasy-theme.cjs';
const text={color:theme.text,lineHeight:22},panel={padding:16,borderRadius:16,gap:12,backgroundColor:theme.panel,borderWidth:1,borderColor:theme.border};
export default function FantasyWorkspace({section,request,onHome}){
 const [leagues,sl]=useState([]),[leagueId,si]=useState(''),[error,se]=useState(''),[loading,sb]=useState(true),[retry,sr]=useState(0);
 useEffect(()=>{let active=true;sb(true);se('');request('/leagues').then(d=>{if(active){sl(d.leagues);si(old=>d.leagues.some(l=>l.id===old)?old:d.leagues[0]?.id||'')}}).catch(e=>{if(active)se(e.message)}).finally(()=>{if(active)sb(false)});return()=>{active=false}},[retry]);
 const league=leagues.find(l=>l.id===leagueId),action=(label,onPress,selected=false)=><Pressable accessibilityRole="button" onPress={onPress} style={{padding:13,borderRadius:10,backgroundColor:selected?theme.button:theme.header}}><Text style={{...text,fontWeight:'800',color:selected?theme.buttonText:theme.text,textAlign:'center'}}>{label}</Text></Pressable>;
 return <View style={{gap:14}}><Text style={{color:theme.surfaceText,fontSize:27,fontWeight:'900'}}>{section==='market'?'Mercado':'11 inicial'}</Text><View style={panel}><Text style={text}>Liga Fantasy</Text>{leagues.map(l=><React.Fragment key={l.id}>{action((l.id===leagueId?'✓ ':'')+l.name,()=>si(l.id),l.id===leagueId)}</React.Fragment>)}{loading&&<Text style={text}>Consultando tu liga…</Text>}{error&&<Text accessibilityRole="alert" style={{...text,color:theme.negative}}>{error}</Text>}{!loading&&!error&&!leagues.length&&<Text style={text}>Crea una liga o únete con un código desde Plantilla.</Text>}{action('Ir a Plantilla',onHome)}{action('Actualizar ligas y datos',()=>sr(n=>n+1))}</View>
 {league&&section==='lineup'&&<View style={panel}><Text style={{...text,fontSize:20,fontWeight:'800'}}>{league.name}</Text><Text style={text}>Tu once titular</Text><Text style={text}>La edición de alineaciones Fantasy está en preparación. Todavía no puedes guardar un once ni sumar puntos.</Text><Text style={text}>Reglas de esta liga: once titular, cierre el viernes a las {league.settings.deadline}, hora de Madrid.</Text></View>}
 {league&&section==='market'&&<FantasyTrading key={leagueId+':'+retry} leagueId={leagueId} request={request}/>}</View>
}
