import {applyFantasyPalette} from './FantasyUI';
import {initializeFantasyTheme,subscribeFantasyTheme,currentFantasyPalette} from './fantasy-appearance';
import FantasyPrizeReceipt from './FantasyPrizeReceipt';
import FantasyPurchaseReceipt from './FantasyPurchaseReceipt';
import {FantasyRules} from './FantasyUI';
import FantasyLeagues,{fantasyRequest} from './FantasyLeagues';
import FantasySettings from './FantasySettings';
import {useBackAction} from './useBackNavigation';
import fantasyTheme from './fantasy-theme.cjs';
import FantasyIcon from './FantasyIcon';
import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,AppState,useColorScheme} from 'react-native';
const text={color:fantasyTheme.text,lineHeight:22},panel={padding:18,gap:14,borderRadius:18,backgroundColor:fantasyTheme.panel,borderWidth:1,borderColor:fantasyTheme.border};
function Construction(){return <View style={{...panel,alignItems:'center',paddingVertical:36}}><FantasyIcon size={112}/><Text style={{color:fantasyTheme.accent,fontSize:25,fontWeight:'900',textAlign:'center'}}>VillalbillaFantasy</Text><Text style={{color:fantasyTheme.text,fontSize:22,fontWeight:'800',textAlign:'center'}}>Está en construcción</Text><Text style={{...text,fontSize:18,textAlign:'center'}}>¡Ya queda poco!</Text><Text style={{...text,textAlign:'center'}}>Pronto podrás crear tu liga e invitar a tus amigos por código.</Text></View>}
function FantasyScreenContent({account,section='plantilla',onSectionChange=()=>{},onFinance=()=>{},preferredLeagueId,onLeagueChange}){
 const systemScheme=useColorScheme(),[appearanceRevision,refreshAppearance]=useState(0);
 useEffect(()=>{let live=true;initializeFantasyTheme().catch(()=>{});const listener=()=>{if(live)refreshAppearance(v=>v+1)};const unsubscribe=subscribeFantasyTheme(listener);return()=>{live=false;unsubscribe()}},[]);
 applyFantasyPalette(currentFantasyPalette(systemScheme));
 Object.assign(text,{color:fantasyTheme.text});Object.assign(panel,{backgroundColor:fantasyTheme.panel,borderColor:fantasyTheme.border});
 const admin=account?.status==='admin',scope=JSON.stringify([account?.id,account?.status,account?.claim?.teamId,account?.claim?.role]),[record,setRecord]=useState(null),[error,se]=useState(''),[retry,sr]=useState(0);
 const access=record?.scope===scope?record.data:null,rules=access?.rules,canPlay=access?.canPlay,disabled=access?.disabled===true;
 useBackAction(()=>{onSectionChange('plantilla');return true},20,section!=='plantilla');
 useEffect(()=>{const timer=setInterval(()=>sr(n=>n+1),300000),listener=AppState.addEventListener('change',state=>{if(state==='active')sr(n=>n+1)});return()=>{clearInterval(timer);listener.remove()}},[]);
 useEffect(()=>{
  if(!account?.id){setRecord(null);return}let active=true;se('');
  const apply=data=>{if(active){setRecord({scope,data});if(!data.canPlay||data.disabled&&!admin)onFinance(null)}};
  fantasyRequest('/preview',{scope,onCached:apply}).then(apply).catch(e=>{if(active){if(e.status===401||e.status===403){setRecord(null);onFinance(null)}se(e.message||'No se pudo comprobar el acceso.')}});
  return()=>{active=false};
 },[scope,retry]);
 if(!account?.id)return <Construction/>;
 if(rules){
  if(section==='settings'&&admin)return <FantasySettings account={account} request={fantasyRequest} onBack={()=>onSectionChange('plantilla')}/>;
  if(disabled&&!admin)return <View style={panel}><FantasyIcon size={80}/><Text style={{...text,fontSize:23,fontWeight:'800'}}>Fantasy · Próximamente</Text><Text style={text}>Está en construcción. ¡Ya queda poco!</Text><Text style={text}>El acceso está reservado temporalmente a administradores.</Text></View>;
  if(access.excluded)return <View style={panel}><Text style={text}>Tu acceso a Fantasy está desactivado.</Text></View>;
  if(!canPlay)return <View style={panel}><Text style={text}>Solo pueden jugar jugadores y cuerpo técnico con una cuenta aprobada e identificados en las actas oficiales. Si ya cumples estos requisitos, revisa tu identidad en el perfil.</Text><Text style={text}>Crear liga · Próximamente</Text></View>;
  if(section==='settings')return <FantasyRules request={fantasyRequest}/>;
  return <View><FantasyPurchaseReceipt accountId={account.id} key={'receipt-'+account.id} request={fantasyRequest} onOpenLeague={id=>{onLeagueChange?.(id);onSectionChange('plantilla')}}/><FantasyLeagues key={account.id+':'+appearanceRevision+':'+systemScheme} account={account} section={section} onFinance={onFinance} preferredLeagueId={preferredLeagueId} onLeagueChange={onLeagueChange}/><FantasyPrizeReceipt key={'prize-'+account.id} request={fantasyRequest}/></View>;
 }
 return <View style={panel}><Text style={text}>{error||'Comprobando identidad en las actas…'}</Text>{error&&<Pressable accessibilityRole="button" onPress={()=>sr(n=>n+1)} style={{padding:12,backgroundColor:fantasyTheme.button,borderRadius:10}}><Text style={{color:fantasyTheme.buttonText,fontWeight:'800'}}>Reintentar acceso</Text></Pressable>}</View>;
}

// Navegación inmediata, sin transiciones animadas.
export default function FantasyScreen(props){
 return <View style={{position:'relative',minHeight:100}}><FantasyScreenContent {...props}/></View>;
}
