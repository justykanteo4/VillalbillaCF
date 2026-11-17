import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,TextInput,Modal,ScrollView,AppState} from 'react-native';
import PlayerPortrait from './PlayerPortrait';
import FantasyPlayerPosition from './FantasyPlayerPosition';
import {Button,ErrorText,panel,title,text,input,theme,money} from './FantasyUI';

const million=value=>Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:2})+' M';
export default function FantasyRivals({leagueId,request,onUpdated=()=>{}}){
 const [data,setData]=useState(null),[selected,setSelected]=useState(null),[expanded,setExpanded]=useState(null);
 const [operation,setOperation]=useState(null),[amount,setAmount]=useState(''),[quote,setQuote]=useState(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const alive=useRef(true),locked=useRef(false),requestId=useRef(null);
 async function refresh(force=false){
  try{
   setError('');
   const apply=value=>{if(alive.current)setData(value)};
   const next=await request('/leagues/'+leagueId+'/rivals',{...(force?{cache:'reload'}:{}),onCached:apply});
   apply(next);
  }catch(e){if(alive.current)setError(e.message||'No se pudieron consultar las plantillas.')}
  finally{if(alive.current)setLoading(false)}
 }
 useEffect(()=>{
  alive.current=true;setData(null);setSelected(null);setExpanded(null);setLoading(true);refresh();
  const timer=setInterval(()=>refresh(),300000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  return()=>{alive.current=false;clearInterval(timer);listener.remove()};
 },[leagueId]);
 function openOffer(player){
  setError('');setNotice('');setSelected(player);setOperation('offer');setQuote(null);setAmount(String(Number(player.price||1).toFixed(2)));
  requestId.current='rival-offer-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 }
 async function openClause(player){
  setError('');setNotice('');setSelected(player);setOperation('clause');setQuote(null);
  requestId.current='rival-clause-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  try{
   const latest=await request('/leagues/'+leagueId+'/clause?ownershipId='+encodeURIComponent(player.ownershipId),{cache:'reload'});
   if(alive.current)setQuote(latest);
  }catch(e){if(alive.current)setError(e.message||'No se pudo consultar la cláusula.')}
 }
 async function execute(){
  if(locked.current||!selected)return;
  const value=Number(amount.replace(',','.'));
  const validOffer=operation==='offer'&&amount.trim()!==''&&Number.isFinite(value)&&value>=1&&value<=1000&&Math.abs(value*100-Math.round(value*100))<1e-6;
  if(operation==='offer'&&!validOffer||operation==='clause'&&(!quote?.enabled||quote?.protectedRoundsRemaining>0||!quote?.amountCents))return;
  locked.current=true;setBusy(true);setError('');
  try{
   const payload=operation==='offer'
    ?{ownershipId:selected.ownershipId,amount:value,requestId:requestId.current}
    :{ownershipId:selected.ownershipId,expectedCents:quote.amountCents,requestId:requestId.current};
   const result=await request('/leagues/'+leagueId+'/'+(operation==='offer'?'offers':'clause'),{method:'POST',body:JSON.stringify(payload)});
   if(operation==='offer'&&result?.saved!==true)throw Error('No se confirmó el envío de la oferta.');
   if(alive.current){setOperation(null);setSelected(null);setQuote(null);setNotice(operation==='offer'?'Oferta enviada. Puedes consultarla en Mercado → Mis operaciones.':'Cláusula pagada. El jugador ya pertenece a tu plantilla.');await refresh(true);await onUpdated()}
  }catch(e){if(alive.current)setError(e.message||'No se pudo completar la operación.')}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 const offerValue=Number(amount.replace(',','.')),offerValid=amount.trim()!==''&&Number.isFinite(offerValue)&&offerValue>=1&&offerValue<=1000&&Math.abs(offerValue*100-Math.round(offerValue*100))<1e-6;
 return <View style={{gap:14}}>
  <Text accessibilityRole="header" style={{...title,fontSize:25}}>Rivales</Text>
  <Text style={{...text,color:theme.muted}}>Consulta las plantillas de tu liga, haz ofertas y paga cláusulas cuando estén disponibles.</Text>
  <ErrorText>{error}</ErrorText>
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  {loading&&!data&&<Text style={text}>Cargando las plantillas…</Text>}
  {data?.offline&&<Text style={{...text,color:theme.accent}}>Mostrando la última copia guardada. Para fichar necesitas conexión.</Text>}
  {data?.rivals?.length===0&&<Text style={text}>Todavía no hay otros participantes en esta liga.</Text>}
  {(data?.rivals||[]).map(rival=><View key={rival.id} style={panel}>
   <Pressable accessibilityRole="button" accessibilityLabel={'Ver plantilla de '+rival.name} accessibilityState={{expanded:expanded===rival.id}} onPress={()=>setExpanded(expanded===rival.id?null:rival.id)} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6}}>
    <View style={{flex:1,gap:4}}>
     <Text style={{...title,fontSize:19}}>{rival.name}</Text>
     <Text style={{...text,color:theme.muted,fontSize:13}}>{rival.players.length} jugadores en plantilla</Text>
    </View>
    <Text style={{...title,color:theme.accent}}>{expanded===rival.id?'−':'+'}</Text>
   </Pressable>
   {expanded===rival.id&&<View style={{gap:8}}>
    {!rival.players.length&&<Text style={text}>Este rival todavía no tiene jugadores.</Text>}
    {rival.players.map(player=><View key={player.ownershipId} style={{gap:9,borderTopWidth:1,borderColor:theme.border,paddingTop:12}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <PlayerPortrait playerId={player.id} teamId={player.teamId} name={player.name} size={48}/>
      <View style={{flex:1,gap:4}}>
       <Text style={{...text,fontWeight:'800'}}>{player.name}</Text>
       <FantasyPlayerPosition player={player} compact/>
      </View>
      <View style={{alignItems:'flex-end'}}>
       <Text style={{...text,fontWeight:'900',color:theme.accent}}>{player.fantasyPoints??0} pts</Text>
       <Text style={{...text,fontSize:12}}>{million(player.price)}</Text>
      </View>
     </View>
     <View style={{flexDirection:'row',gap:8}}>
      <View style={{flex:1}}><Button secondary disabled={busy} onPress={()=>openOffer(player)}>Hacer oferta</Button></View>
      <View style={{flex:1}}><Button secondary disabled={busy||!data.clausesEnabled} onPress={()=>openClause(player)}>Pagar cláusula</Button></View>
     </View>
    </View>)}
   </View>}
  </View>)}
  <Button secondary disabled={loading||busy} onPress={()=>{setLoading(true);refresh(true)}}>{loading?'Actualizando…':'Actualizar rivales'}</Button>
  <Modal visible={!!operation} transparent animationType="fade" onRequestClose={()=>{if(!busy){setOperation(null);setSelected(null)}}}>
   <View style={{flex:1,justifyContent:'center',padding:16,backgroundColor:'#000b'}}>
    <View accessibilityViewIsModal style={{...panel,maxHeight:'90%'}}>
     <ScrollView contentContainerStyle={{gap:12}}>
      <Text style={title}>{operation==='offer'?'Hacer oferta':'Pagar cláusula'}</Text>
      <Text style={{...text,fontWeight:'800'}}>{selected?.name}</Text>
      {operation==='offer'?<>
       <Text style={text}>Ofrece una cantidad por este jugador. El propietario podrá aceptarla o rechazarla.</Text>
       <Text style={text}>Tu oferta en millones</Text>
       <TextInput accessibilityLabel="Importe de oferta al rival" editable={!busy} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={input}/>
       {offerValid&&<Text style={{...text,color:theme.accent,fontWeight:'800'}}>Oferta: {million(offerValue)}</Text>}
      </>:!quote?<Text style={text}>Consultando cláusula actual…</Text>:<>
       <Text style={{...title,color:theme.accent}}>{money(quote.amountCents)}</Text>
       {!quote.enabled&&<Text style={{...text,color:theme.negative}}>Las cláusulas están desactivadas para esta liga.</Text>}
       {quote.protectedRoundsRemaining>0&&<Text style={text}>Jugador protegido durante {quote.protectedRoundsRemaining} jornadas más.</Text>}
       <Text style={text}>Al confirmar, el jugador pasará a tu plantilla si cumples las condiciones de saldo, plantilla y cierre de jornada.</Text>
      </>}
      <ErrorText>{error}</ErrorText>
     </ScrollView>
     <Button disabled={busy||operation==='offer'&&!offerValid||operation==='clause'&&(!quote?.enabled||quote?.protectedRoundsRemaining>0)} onPress={execute}>{busy?'Procesando…':operation==='offer'?'Enviar oferta':'Confirmar pago de cláusula'}</Button>
     <Button secondary disabled={busy} onPress={()=>{setOperation(null);setSelected(null);setError('')}}>Cancelar</Button>
    </View>
   </View>
  </Modal>
 </View>;
}
