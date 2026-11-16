import React,{useRef,useState} from 'react';
import {View,Text,TextInput,Modal} from 'react-native';
import {Button,ErrorText,panel,title,text,input,theme,money} from './FantasyUI';
export default function FantasyPlayerMarket({leagueId,player,request,onUpdated=()=>{},rosterCount}){
 const [open,setOpen]=useState(false),[quote,setQuote]=useState(null),[amount,setAmount]=useState(String(player.price)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const locked=useRef(false),requestId=useRef('');
 async function show(){
  if(locked.current)return;
  setOpen(true);setError('');setQuote(null);
  try{
   const q=await request('/leagues/'+leagueId+'/list-player?playerId='+encodeURIComponent(player.id),{cache:'reload'});
   setQuote(q);requestId.current='listing-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }catch(e){setError(e.message)}
 }
 async function execute(cancel=false){
  if(locked.current||!quote)return;
  const minPrice=Number(amount.replace(',','.'));
  if(!cancel&&(!Number.isFinite(minPrice)||minPrice<1||minPrice>1000||Math.abs(minPrice*100-Math.round(minPrice*100))>1e-6))return;
  locked.current=true;setBusy(true);setError('');
  try{
   const response=await request('/leagues/'+leagueId+'/list-player',{method:'POST',body:JSON.stringify({
    playerId:player.id,ownershipId:quote.ownershipId,requestId:requestId.current,
    ...(cancel?{cancel:true}:{minPrice})
   })});
   if(response?.saved){setOpen(false);setQuote(null);await onUpdated()}
  }catch(e){setError(e.message)}
  finally{locked.current=false;setBusy(false)}
 }
 const price=Number(amount.replace(',','.')),valid=Number.isFinite(price)&&price>=1&&price<=1000&&Math.abs(price*100-Math.round(price*100))<1e-6;
 return <>
  <Button secondary disabled={rosterCount<=12} onPress={show}>🏷️ Poner en el mercado</Button>
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>{if(!busy)setOpen(false)}}>
   <View style={{flex:1,justifyContent:'center',padding:18,backgroundColor:'#000b'}}>
    <View style={{...panel,gap:12}}>
     <Text style={title}>{quote?.listing?'Anuncio en el mercado':'Poner jugador en el mercado'}</Text>
     <Text style={text}>{player.name}</Text>
     {quote?.listing?<><Text style={text}>Precio de salida: {money(quote.listing.minCents)}</Text><Text style={text}>El jugador sigue en tu plantilla hasta que termine la subasta. No podrás retirar el anuncio cuando tenga pujas.</Text><Button secondary disabled={busy} onPress={()=>execute(true)}>Retirar anuncio sin pujas</Button></>:quote&&<>
      <Text style={text}>Elige el precio mínimo de salida en millones:</Text>
      <TextInput accessibilityLabel="Precio de salida de subasta" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={input}/>
      {valid&&<Text style={{...text,color:theme.accent,fontWeight:'900'}}>Precio de salida: {price.toLocaleString('es-ES',{maximumFractionDigits:2})} M</Text>}
      <Text style={{...text,color:theme.muted}}>El jugador seguirá siendo tuyo hasta que finalice una puja adjudicada. La plantilla debe mantener al menos 12 jugadores.</Text>
      <Button disabled={busy||!valid} onPress={()=>execute(false)}>Confirmar anuncio</Button>
     </>}
     <ErrorText>{error}</ErrorText>
     <Button secondary disabled={busy} onPress={()=>setOpen(false)}>Cerrar</Button>
    </View>
   </View>
  </Modal>
 </>;
}
