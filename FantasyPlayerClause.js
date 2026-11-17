import React,{useRef,useState} from 'react';
import {View,Text,Modal,ScrollView,Pressable} from 'react-native';
import {Button,ErrorText,panel,title,text,theme,money} from './FantasyUI';

export default function FantasyPlayerClause({leagueId,player,request,onUpdated=()=>{}}){
 const [visible,show]=useState(false),[quote,setQuote]=useState(null),[amount,setAmount]=useState(1),[wheelWidth,setWheelWidth]=useState(280),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const locked=useRef(false),requestId=useRef(null),wheel=useRef(null),steps=Array.from({length:100},(_,i)=>i+1),stepWidth=70;
 async function open(){
  if(locked.current)return;
  show(true);setQuote(null);setError('');setAmount(1);
  try{
   const q=await request('/leagues/'+leagueId+'/clause?ownershipId='+encodeURIComponent(player.ownershipId),{cache:'reload'});
   setQuote(q);requestId.current='boost-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }catch(e){setError(e.message)}
 }
 async function confirm(){
  const paid=amount;
  if(locked.current||!quote?.enabled||!Number.isFinite(paid)||paid<0.01||paid>1000)return;
  locked.current=true;setBusy(true);setError('');
  try{
   await request('/leagues/'+leagueId+'/clause/boost',{method:'POST',body:JSON.stringify({
    ownershipId:quote.ownershipId,requestId:requestId.current,amount:paid})});
   show(false);setQuote(null);await onUpdated();
  }catch(e){setError(e.message)}
  finally{locked.current=false;setBusy(false)}
 }
 const paid=amount,valid=Number.isSafeInteger(paid)&&paid>=1&&paid<=100;
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
       <Text style={{...title,textAlign:'center',color:theme.accent}}>{paid} M</Text>
       <Text style={{...text,textAlign:'center',color:theme.muted,fontSize:12}}>Desliza para elegir cuánto invertir</Text>
       <View onLayout={event=>setWheelWidth(event.nativeEvent.layout.width)} style={{borderRadius:14,overflow:'hidden',backgroundColor:theme.header,borderWidth:1,borderColor:theme.border}}>
        <View pointerEvents="none" style={{position:'absolute',alignSelf:'center',width:70,height:'100%',backgroundColor:theme.panel,borderColor:theme.accent,borderWidth:2,borderRadius:10,zIndex:1}}/>
        <ScrollView horizontal ref={wheel} showsHorizontalScrollIndicator={false} snapToInterval={stepWidth} decelerationRate="fast"
          contentContainerStyle={{paddingHorizontal:Math.max(0,(wheelWidth-stepWidth)/2),paddingVertical:12,alignItems:'center'}}
          onMomentumScrollEnd={event=>setAmount(Math.max(1,Math.min(100,Math.round(event.nativeEvent.contentOffset.x/stepWidth)+1)))}
          onScrollEndDrag={event=>{if(!event.nativeEvent.velocity?.x)setAmount(Math.max(1,Math.min(100,Math.round(event.nativeEvent.contentOffset.x/stepWidth)+1)))}}>
         {steps.map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={'Invertir '+value+' millones'} onPress={()=>{setAmount(value);wheel.current?.scrollTo({x:(value-1)*stepWidth,animated:true})}} style={{width:stepWidth,alignItems:'center',justifyContent:'center',height:52}}>
          <Text style={{color:value===paid?theme.accent:theme.text,fontSize:value===paid?19:15,fontWeight:value===paid?'900':'600'}}>{value} M</Text>
         </Pressable>)}
        </ScrollView>
       </View>
       {valid&&<View style={{gap:8,padding:12,borderRadius:12,borderWidth:1,borderColor:theme.accent,backgroundColor:theme.header}}>
        <Text style={{...text,fontWeight:'800',textAlign:'center'}}>Cálculo de la nueva cláusula</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',alignItems:'center',gap:8}}>
         <View style={{alignItems:'center'}}><Text style={{...text,color:theme.muted,fontSize:12}}>Actual</Text><Text style={{...title,fontSize:19}}>{money(quote.amountCents)}</Text></View>
         <Text style={{...title,fontSize:22}}>+</Text>
         <View style={{alignItems:'center'}}><Text style={{...text,color:theme.muted,fontSize:12}}>Subida</Text><Text style={{...title,fontSize:19}}>{money(Math.round(paid*200))}</Text></View>
         <Text style={{...title,fontSize:22}}>=</Text>
         <View style={{alignItems:'center'}}><Text style={{...text,color:theme.accent,fontSize:12}}>Nueva cláusula</Text><Text style={{...title,fontSize:23,color:theme.accent}}>{money(quote.amountCents+Math.round(paid*200))}</Text></View>
        </View>
        <Text style={{...text,textAlign:'center',color:theme.muted}}>Inviertes {paid.toLocaleString('es-ES')} M · Aumenta {(paid*2).toLocaleString('es-ES')} M · Dura 2 jornadas</Text>
       </View>}
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
