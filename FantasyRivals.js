import FantasyOrder from './FantasyOrder';
import {orderFantasyRows} from './fantasy-list-order.cjs';
import {FantasyTeamPhoto} from './FantasyTeamIdentity';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,TextInput,Modal,ScrollView,AppState} from 'react-native';
import PlayerPortrait from './PlayerPortrait';
import FantasyPlayerPosition from './FantasyPlayerPosition';
import {Button,ErrorText,panel,title,text,input,theme,money} from './FantasyUI';

const million=value=>Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:2})+' M';
export default function FantasyRivals({leagueId,request,onUpdated=()=>{}}){
 const [order,setOrder]=useState('points');
 const [data,setData]=useState(null),[selected,setSelected]=useState(null),[expanded,setExpanded]=useState(null);
 const [operation,setOperation]=useState(null),[amount,setAmount]=useState(''),[quote,setQuote]=useState(null);
 const [exchanges,setExchanges]=useState([]),[myPlayers,setMyPlayers]=useState([]),[exchangeMine,setExchangeMine]=useState(null);
 const [loans,setLoans]=useState([]),[loanMine,setLoanMine]=useState(null),[loanWeeks,setLoanWeeks]=useState(1);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const alive=useRef(true),locked=useRef(false),requestId=useRef(null),sequence=useRef(0);
 async function refresh(force=false){
  const generation=++sequence.current;
  try{
   if(alive.current)setError('');
   const apply=value=>{if(alive.current&&generation===sequence.current)setData(value)};
   const next=await request('/leagues/'+leagueId+'/rivals',{...(force?{cache:'reload'}:{}),onCached:apply});
   apply(next);
   const [operations,loanData]=await Promise.all([request('/leagues/'+leagueId+'/exchanges',{...(force?{cache:'reload'}:{})}),request('/leagues/'+leagueId+'/loans',{...(force?{cache:'reload'}:{})})]);
   if(alive.current&&generation===sequence.current)setExchanges(operations.exchanges||[]);
   if(alive.current&&generation===sequence.current)setLoans(loanData.loans||[]);
  }catch(e){if(alive.current&&generation===sequence.current)setError(e.message||'No se pudieron consultar las plantillas.')}
  finally{if(alive.current&&generation===sequence.current)setLoading(false)}
 }
 useEffect(()=>{
  alive.current=true;setData(null);setSelected(null);setExpanded(null);setLoading(true);refresh();
  // A timer with the usual 15-minute cache TTL cannot actually refresh rival ownership every five minutes.
  // A foreground refresh bypasses the TTL; the last saved snapshot is still available offline.
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh(true)},300000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh(true)});
  return()=>{alive.current=false;sequence.current++;clearInterval(timer);listener.remove()};
 },[leagueId]);
 async function openExchange(player){
  setError('');setNotice('');setSelected(player);setOperation('exchange');setQuote(null);setExchangeMine(null);
  requestId.current='exchange-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  try{
   const market=await request('/leagues/'+leagueId+'/market',{cache:'reload'});
   if(alive.current)setMyPlayers((market.roster||[]).filter(p=>p.mine));
  }catch(e){if(alive.current)setError(e.message||'No se pudo consultar tu plantilla.')}
 }
 async function decideExchange(exchange,decision){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');
  try{
   const result=await request('/leagues/'+leagueId+'/exchanges/'+exchange.id+'/'+decision,{method:'POST',body:'{}'});
   if(result?.saved!==true)throw Error('No se confirmó la operación.');
   if(alive.current){setNotice(decision==='accept'?'Intercambio aceptado. Revisa tu alineación.':decision==='reject'?'Intercambio rechazado.':'Propuesta cancelada.');await refresh(true);await onUpdated()}
  }catch(e){if(alive.current)setError(e.message||'No se pudo actualizar el intercambio.')}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 async function openLoan(rival){
  setError('');setNotice('');setSelected(rival);setOperation('loan');setLoanMine(null);setLoanWeeks(1);
  requestId.current='loan-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  try{
   const market=await request('/leagues/'+leagueId+'/market',{cache:'reload'});
   if(alive.current)setMyPlayers((market.roster||[]).filter(p=>p.mine));
  }catch(e){if(alive.current)setError(e.message||'No se pudo consultar tu plantilla.')}
 }
 async function decideLoan(loan,decision){
  if(locked.current)return;
  locked.current=true;setBusy(true);setError('');
  try{
   const result=await request('/leagues/'+leagueId+'/loans/'+loan.id+'/'+decision,{method:'POST',body:'{}'});
   if(result?.saved!==true)throw Error('No se confirmó la cesión.');
   if(alive.current){setNotice(decision==='accept'?'Cesión aceptada. El jugador se devolverá automáticamente al terminar.':decision==='reject'?'Cesión rechazada.':'Propuesta cancelada.');await refresh(true);await onUpdated()}
  }catch(e){if(alive.current)setError(e.message||'No se pudo actualizar la cesión.')}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
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
  if(operation==='offer'&&!validOffer||operation==='clause'&&(!quote?.enabled||quote?.protectedRoundsRemaining>0||!quote?.amountCents)||operation==='exchange'&&!exchangeMine||operation==='loan'&&!loanMine)return;
  locked.current=true;setBusy(true);setError('');
  try{
   const payload=operation==='loan'?{ownershipId:loanMine.ownershipId,borrowerUid:selected.id,weeks:loanWeeks,requestId:requestId.current}
    :operation==='exchange'
    ?{myOwnershipId:exchangeMine.ownershipId,rivalOwnershipId:selected.ownershipId,requestId:requestId.current}
    :operation==='offer'?{ownershipId:selected.ownershipId,amount:value,requestId:requestId.current}
    :{ownershipId:selected.ownershipId,expectedCents:quote.amountCents,requestId:requestId.current};
   const result=await request('/leagues/'+leagueId+'/'+(operation==='loan'?'loans':operation==='exchange'?'exchanges':operation==='offer'?'offers':'clause'),{method:'POST',body:JSON.stringify(payload)});
   if(operation==='offer'&&result?.saved!==true)throw Error('No se confirmó el envío de la oferta.');
   if(alive.current){setOperation(null);setSelected(null);setQuote(null);setNotice(operation==='loan'?'Cesión ofrecida. El rival deberá aceptarlo.':operation==='exchange'?'Intercambio propuesto. El rival deberá aceptarlo.':operation==='offer'?'Oferta enviada. Puedes consultarla en Mercado → Mis operaciones.':'Cláusula pagada. El jugador ya pertenece a tu plantilla.');await refresh(true);await onUpdated()}
  }catch(e){if(alive.current)setError(e.message||'No se pudo completar la operación.')}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 const offerValue=Number(amount.replace(',','.')),offerValid=amount.trim()!==''&&Number.isFinite(offerValue)&&offerValue>=1&&offerValue<=1000&&Math.abs(offerValue*100-Math.round(offerValue*100))<1e-6;
 return <View style={{gap:14}}>
  <Text accessibilityRole="header" style={{...title,fontSize:25}}>Rivales</Text>
  
  <ErrorText>{error}</ErrorText>
  {!!notice&&<Text accessibilityRole="alert" style={{...text,color:theme.accent}}>{notice}</Text>}
  {loading&&!data&&<Text style={text}>Cargando las plantillas…</Text>}
  {data?.offline&&<Text style={{...text,color:theme.accent}}>Mostrando la última copia guardada. Para fichar necesitas conexión.</Text>}
  {data?.rivals?.length===0&&<Text style={text}>Sin rivales todavía.</Text>}
  {!!loans.length&&<View style={panel}>
   <Text style={{...title,fontSize:19}}>Cesiones</Text>
   {loans.map(l=><View key={l.id} style={{gap:7,borderTopWidth:1,borderColor:theme.border,paddingTop:10}}>
    <Text style={{...text,fontWeight:'800'}}>{l.playerName} · {l.durationWeeks} {l.durationWeeks===1?'semana':'semanas'}</Text>
    <Text style={text}>{l.lender} → {l.borrower}</Text>
    <Text style={{...text,color:theme.muted}}>Estado: {({pending:'Pendiente',active:'Cedido',returned:'Devuelto',rejected:'Rechazado',cancelled:'Cancelado',expired:'Caducado'})[l.status]||l.status}</Text>
    {l.status==='active'&&<Text style={text}>Devolución prevista: {new Date(l.endsAt).toLocaleDateString('es-ES')}</Text>}
    {l.status==='pending'&&(l.incoming?<View style={{gap:7}}><Button disabled={busy} onPress={()=>decideLoan(l,'accept')}>Aceptar cesión</Button><Button secondary disabled={busy} onPress={()=>decideLoan(l,'reject')}>Rechazar</Button></View>:<Button secondary disabled={busy} onPress={()=>decideLoan(l,'cancel')}>Cancelar propuesta</Button>)}
   </View>)}
  </View>}
  {!!exchanges.length&&<View style={panel}><Text style={{...title,fontSize:19}}>Intercambios</Text>
   {exchanges.map(e=><View key={e.id} style={{gap:7,borderTopWidth:1,borderColor:theme.border,paddingTop:10}}>
    <Text style={{...text,fontWeight:'800'}}>{e.incoming?'Propuesta de '+e.proposer:'Propuesta para '+e.receiver}</Text>
    <Text style={text}>Ofrecido: {e.proposerPlayerName} · Solicitado: {e.receiverPlayerName}</Text>
    <Text style={{...text,color:theme.muted}}>Estado: {({pending:'Pendiente',accepted:'Aceptado',rejected:'Rechazado',cancelled:'Cancelado',expired:'Caducado'})[e.status]||e.status}</Text>
    {e.status==='pending'&&(e.incoming?<View style={{gap:7}}><Button disabled={busy} onPress={()=>decideExchange(e,'accept')}>Aceptar intercambio</Button><Button secondary disabled={busy} onPress={()=>decideExchange(e,'reject')}>Rechazar</Button></View>:<Button secondary disabled={busy} onPress={()=>decideExchange(e,'cancel')}>Cancelar propuesta</Button>)}
   </View>)}
  </View>}
  {(data?.rivals||[]).map(rival=><View key={rival.id} style={panel}>
   <Pressable accessibilityRole="button" accessibilityLabel={'Ver plantilla de '+rival.name} accessibilityState={{expanded:expanded===rival.id}} onPress={()=>{const opening=expanded!==rival.id;setExpanded(opening?rival.id:null);if(opening)void refresh(true)}} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6}}>
    <FantasyTeamPhoto photo={rival.photo} size={52}/><View style={{flex:1,gap:4}}>
     <Text style={{...title,fontSize:19}}>{rival.name}</Text>
     <Text style={{...text,color:theme.muted,fontSize:13}}>{rival.players.length} jugadores en plantilla</Text>
     {rival.players.some(p=>p.forSale&&p.expiresAt>Date.now())&&<Text style={{...text,color:theme.accent,fontWeight:'800',fontSize:12}}>🏷️ {rival.players.filter(p=>p.forSale&&p.expiresAt>Date.now()).length} en venta</Text>}
    </View>
    <Text style={{...title,color:theme.accent}}>{expanded===rival.id?'−':'+'}</Text>
   </Pressable>
   {expanded===rival.id&&<View style={{gap:8}}>
    <Button secondary disabled={busy} onPress={()=>openLoan(rival)}>Ofrecer una cesión</Button>
    {!rival.players.length&&<Text style={text}>Este rival todavía no tiene jugadores.</Text>}
    <FantasyOrder value={order} onChange={setOrder}/>{orderFantasyRows(rival.players,order).map(player=><View key={player.ownershipId} style={{gap:9,borderTopWidth:1,borderColor:theme.border,paddingTop:12}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <PlayerPortrait playerId={player.id} teamId={player.teamId} name={player.name} size={48}/>
      <View style={{flex:1,gap:4}}>
       <Text style={{...text,fontWeight:'800'}}>{player.name}</Text>
       <FantasyPlayerPosition player={player} compact/>
       {player.forSale&&player.expiresAt>Date.now()&&<Text style={{...text,color:theme.accent,fontWeight:'900',fontSize:12}}>🏷️ EN VENTA · Desde {million(player.minPrice)}</Text>}
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
     <Button secondary disabled={busy} onPress={()=>openExchange(player)}>Proponer intercambio</Button>
    </View>)}
   </View>}
  </View>)}
  <Button secondary disabled={loading||busy} onPress={()=>{setLoading(true);refresh(true)}}>{loading?'Actualizando…':'Actualizar rivales'}</Button>
  <Modal visible={!!operation} transparent animationType="fade" onRequestClose={()=>{if(!busy){setOperation(null);setSelected(null)}}}>
   <View style={{flex:1,justifyContent:'center',padding:16,backgroundColor:'#000b'}}>
    <View accessibilityViewIsModal style={{...panel,maxHeight:'90%'}}>
     <ScrollView contentContainerStyle={{gap:12}}>
      <Text style={title}>{operation==='loan'?'Ofrecer cesión':operation==='exchange'?'Proponer intercambio':operation==='offer'?'Hacer oferta':'Pagar cláusula'}</Text>
      <Text style={{...text,fontWeight:'800'}}>{selected?.name}</Text>
      {operation==='loan'?<>
       <Text style={text}>Elige un jugador de tu plantilla para cederlo al rival durante 1 a 4 semanas. El equipo receptor debe aceptarlo. Se reservará tu plaza para recuperarlo automáticamente al finalizar.</Text>
       <Text style={{...text,fontWeight:'800'}}>Jugador a ceder</Text>
       {myPlayers.map(p=><Button key={p.ownershipId} secondary disabled={busy} onPress={()=>setLoanMine(p)}>{loanMine?.ownershipId===p.ownershipId?'● ':''}{p.name}</Button>)}
       <Text style={{...text,fontWeight:'800'}}>Duración de la cesión</Text>
       <View style={{flexDirection:'row',gap:6}}>{[1,2,3,4].map(n=><View key={n} style={{flex:1}}><Button secondary disabled={busy} onPress={()=>setLoanWeeks(n)}>{loanWeeks===n?'● ':''}{n} {n===1?'sem.':'sem.'}</Button></View>)}</View>
       {!myPlayers.length&&<Text style={text}>No hay jugadores disponibles. Actualiza tu plantilla.</Text>}
      </>:operation==='exchange'?<>
       <Text style={text}>Elige un jugador de tu plantilla para cambiarlo por el jugador del rival. Ambos equipos conservarán el mismo número de futbolistas. La operación solo se hará cuando el rival acepte.</Text>
       {myPlayers.map(p=><Button key={p.ownershipId} secondary disabled={busy} onPress={()=>setExchangeMine(p)}>{exchangeMine?.ownershipId===p.ownershipId?'● ':''}{p.name}</Button>)}
       {!myPlayers.length&&<Text style={text}>No hay jugadores disponibles. Comprueba la conexión.</Text>}
      </>:operation==='offer'?<>
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
     <Button disabled={busy||operation==='loan'&&!loanMine||operation==='exchange'&&!exchangeMine||operation==='offer'&&!offerValid||operation==='clause'&&(!quote?.enabled||quote?.protectedRoundsRemaining>0)} onPress={execute}>{busy?'Procesando…':operation==='loan'?'Ofrecer cesión':operation==='exchange'?'Enviar propuesta de intercambio':operation==='offer'?'Enviar oferta':'Confirmar pago de cláusula'}</Button>
     <Button secondary disabled={busy} onPress={()=>{setOperation(null);setSelected(null);setError('')}}>Cancelar</Button>
    </View>
   </View>
  </Modal>
 </View>;
}
