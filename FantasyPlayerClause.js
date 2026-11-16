import React,{useRef,useState} from 'react';
import {View,Text,TextInput,Modal,ScrollView} from 'react-native';
import {Button,ErrorText,panel,title,text,input,theme,money} from './FantasyUI';

export default function FantasyPlayerClause({leagueId,player,request,onUpdated=()=>{}}){
 const [visible,show]=useState(false),[quote,setQuote]=useState(null),[amount,setAmount]=useState('1'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const locked=useRef(false),requestId=useRef(null);
 async function open(){
  if(locked.current)return;
  show(true);setQuote(null);setError('');
  try{
   const q=await request('/leagues/'+leagueId+'/clause?ownershipId='+encodeURIComponent(player.ownershipId),{cache:'reload'});
   setQuote(q);requestId.current='boost-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }catch(e){setError(e.message)}
 }
 async function confirm(){
  const paid=Number(amount.replace(',','.'));
  if(locked.current||!quote?.enabled||!Number.isFinite(paid)||paid<0.01||paid>1000)return;
  locked.current=true;setBusy(true);setError('');
  try{
   await request('/leagues/'+leagueId+'/clause/boost',{method:'POST',body:JSON.stringify({
    ownershipId:quote.ownershipId,requestId:requestId.current,amount:paid})});
   show(false);setQuote(null);await onUpdated();
  }catch(e){setError(e.message)}
  finally{locked.current=false;setBusy(false)}
 }
 const paid=Number(amount.replace(',','.')),valid=Number.isFinite(paid)&&paid>=0.01&&paid<=1000&&Math.abs(paid*100-Math.round(paid*100))<1e-6;
 return <>
  <Button secondary onPress={open}>🛡️ Subir cláusula</Button>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>{if(!busy)show(false)}}>
   <View style={{flex:1,justifyContent:'center',padding:18,backgroundColor:'#000b'}}>
    <View style={{...panel,maxHeight:'92%',gap:12}}>
     <ScrollView contentContainerStyle={{gap:12}}>
      <Text style={title}>Subir cláusula de {player.name}</Text>
      {quote&&<>
       <Text style={text}>Cláusula actual: {money(quote.amountCents)}</Text>
       <Text style={{...text,color:theme.muted}}>La subida cuesta 1 M por cada 2 M añadidos. Dura dos jornadas.</Text>
       {!!quote.boostExpiresRound&&<Text style={text}>Protección aumentada hasta la jornada {quote.boostExpiresRound}.</Text>}
       {!quote.enabled&&<Text style={{...text,color:theme.negative}}>El club todavía no ha activado las cláusulas en esta liga.</Text>}
       <Text style={text}>¿Cuántos millones quieres invertir?</Text>
       <TextInput accessibilityLabel="Millones para subir cláusula" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={input}/>
       {valid&&<Text style={{...text,color:theme.accent,fontWeight:'900'}}>Añades {(paid*2).toLocaleString('es-ES',{maximumFractionDigits:2})} M · Nueva cláusula orientativa: {money(quote.amountCents+Math.round(paid*200))}</Text>}
      </>}
      <ErrorText>{error}</ErrorText>
     </ScrollView>
     <Button disabled={busy||!quote?.enabled||!valid} onPress={confirm}>{busy?'Guardando…':'Confirmar subida de cláusula'}</Button>
     <Button secondary disabled={busy} onPress={()=>show(false)}>Cancelar</Button>
    </View>
   </View>
  </Modal>
 </>;
}
