import React,{useRef,useState} from 'react';
import {View,Text,TextInput,Modal,ScrollView,Pressable} from 'react-native';
import {Button,ErrorText,panel,title,text,input,theme,money} from './FantasyUI';
export default function FantasyPlayerMarket({leagueId,player,request,onUpdated=()=>{},rosterCount}){
 const [open,setOpen]=useState(false),[quote,setQuote]=useState(null),[amount,setAmount]=useState(String(player.price)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const locked=useRef(false),requestId=useRef(''),wheel=useRef(null),stepWidth=70;
 const [wheelWidth,setWheelWidth]=useState(280),basePrice=Math.max(1,Math.round(Number(player.price)||1));
 const wheelPrices=Array.from({length:Math.min(101,1001-basePrice)},(_,i)=>basePrice+i);
 async function show(){
  if(locked.current)return;
  setOpen(true);setError('');setQuote(null);
  try{
   const q=await request('/leagues/'+leagueId+'/list-player?playerId='+encodeURIComponent(player.id),{cache:'reload'});
   setQuote(q);setAmount(String(basePrice));requestId.current='listing-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
   wheel.current?.scrollTo({x:0,animated:false});
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
  <Button secondary disabled={rosterCount<=12&&!player.forSale} onPress={show}>{player.forSale?'Retirar del mercado':'🏷️ Poner en el mercado'}</Button>
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>{if(!busy)setOpen(false)}}>
   <View style={{flex:1,justifyContent:'center',padding:18,backgroundColor:'#000b'}}>
    <View style={{...panel,gap:12}}>
     <Text style={title}>{quote?.listing?'Anuncio en el mercado':'Poner jugador en el mercado'}</Text>
     <Text style={text}>{player.name}</Text>
     {quote?.listing?<><Text style={text}>Precio de salida: {money(quote.listing.minCents)}</Text><Text style={text}>El jugador sigue en tu plantilla mientras esté en venta. Los rivales pueden hacer ofertas directas y pujar por él.</Text><Text style={{...text,color:theme.accent}}>{quote.listing.canWithdraw?'Ya puedes retirar el anuncio. Las pujas pendientes se cancelarán y los importes se liberarán.':'Podrás retirar el anuncio a partir del '+new Date(quote.listing.canWithdrawAt).toLocaleString('es-ES')+', si el jugador no se ha vendido.'}</Text><Button secondary disabled={busy||!quote.listing.canWithdraw} onPress={()=>execute(true)}>Retirar del mercado y mantener en plantilla</Button></>:quote&&<>
      <Text style={text}>Elige el precio mínimo de salida en millones:</Text>
      <Text style={{...title,textAlign:'center',color:theme.accent}}>{price.toLocaleString('es-ES',{maximumFractionDigits:2})} M</Text>
      <Text style={{...text,color:theme.muted,textAlign:'center',fontSize:12}}>Desliza la ruleta para aumentar el precio de salida</Text>
      <View onLayout={event=>setWheelWidth(event.nativeEvent.layout.width)} style={{borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:theme.border,backgroundColor:theme.header}}>
       <View pointerEvents="none" style={{position:'absolute',alignSelf:'center',width:70,height:'100%',borderColor:theme.accent,borderWidth:2,borderRadius:10,zIndex:1}}/>
       <ScrollView horizontal ref={wheel} snapToInterval={stepWidth} decelerationRate="fast" showsHorizontalScrollIndicator={false}
         contentContainerStyle={{paddingHorizontal:Math.max(0,(wheelWidth-stepWidth)/2),paddingVertical:10}}
         onMomentumScrollEnd={event=>setAmount(String(wheelPrices[Math.max(0,Math.min(wheelPrices.length-1,Math.round(event.nativeEvent.contentOffset.x/stepWidth)))]))}>
        {wheelPrices.map(value=><Pressable key={value} accessibilityRole="button" onPress={()=>{setAmount(String(value));wheel.current?.scrollTo({x:(value-basePrice)*stepWidth,animated:true})}} style={{height:48,width:stepWidth,alignItems:'center',justifyContent:'center'}}>
         <Text style={{...text,color:value===price?theme.accent:theme.text,fontWeight:value===price?'900':'600'}}>{value} M</Text>
        </Pressable>)}
       </ScrollView>
      </View>
      <Text style={{...text,color:theme.muted,fontSize:12}}>También puedes escribir un precio exacto (con decimales):</Text>
      <TextInput accessibilityLabel="Precio de salida de subasta" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={input}/>
      {valid&&<Text style={{...text,color:theme.accent,fontWeight:'900'}}>Precio de salida: {price.toLocaleString('es-ES',{maximumFractionDigits:2})} M</Text>}
      <Text style={{...text,color:theme.muted}}>El jugador seguirá siendo tuyo hasta que finalice una puja adjudicada. Puedes retirar el anuncio en cualquier momento antes de la adjudicación. La plantilla debe mantener al menos 12 jugadores.</Text>
      <Button disabled={busy||!valid} onPress={()=>execute(false)}>Confirmar anuncio</Button>
     </>}
     <ErrorText>{error}</ErrorText>
     <Button secondary disabled={busy} onPress={()=>setOpen(false)}>Cerrar</Button>
    </View>
   </View>
  </Modal>
 </>;
}
