import {DividerView} from './AppDividers';
import React,{useEffect} from 'react';
import {Keyboard,Modal,ScrollView,Text,View} from 'react-native';
import PlayerPortrait from './PlayerPortrait';
import {Button,ErrorText,text,title,panel,theme} from './FantasyUI';
export default function FantasyOfferConfirmation({offer,busy=false,error='',onCancel,onConfirm}){
 useEffect(()=>{if(offer)Keyboard.dismiss()},[!!offer]);
 return <Modal visible={!!offer} transparent animationType="fade" statusBarTranslucent onRequestClose={()=>{if(!busy)onCancel()}}><View style={{flex:1,justifyContent:'center',padding:20,backgroundColor:'#000c'}}>{offer&&<DividerView accessibilityViewIsModal style={{...panel,maxHeight:'90%',borderColor:theme.accent}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:14}}><Text accessibilityRole="header" style={title}>Confirmar oferta</Text><View style={{flexDirection:'row',alignItems:'center',gap:12}}><PlayerPortrait playerId={offer.playerId} teamId={offer.teamId} name={offer.playerName} size={68}/><Text style={{...text,fontSize:19,fontWeight:'900',flex:1}}>{offer.playerName}</Text></View><Text style={text}>Propietario: {offer.owner}</Text><Text style={{...text,color:theme.accent,fontSize:27,fontWeight:'900'}}>{offer.amount.toLocaleString('es-ES',{maximumFractionDigits:2})} M</Text><Text style={text}>¿Quieres enviar esta oferta? El propietario podrá aceptarla o rechazarla. La oferta no reserva dinero; al aceptarla se comprueban el saldo y los límites de las plantillas.</Text><ErrorText>{error}</ErrorText></ScrollView><Button disabled={busy} onPress={()=>onConfirm(offer)}>{busy?'Enviando…':'Confirmar oferta'}</Button><Button secondary disabled={busy} onPress={onCancel}>Cancelar</Button></DividerView>}</View></Modal>;
}
