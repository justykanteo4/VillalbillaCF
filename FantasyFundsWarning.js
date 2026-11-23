import {DividerView} from './AppDividers';
import React,{useEffect} from 'react';
import {Keyboard,Modal,ScrollView,Text,View} from 'react-native';
import {Button,text,panel,title} from './FantasyUI';
export default function FantasyFundsWarning({message,offer=false,onClose}){useEffect(()=>{if(message)Keyboard.dismiss()},[message]);return <Modal visible={!!message} transparent animationType="fade" onRequestClose={onClose}><View style={{flex:1,justifyContent:'center',alignItems:'center',padding:20,backgroundColor:'#000b'}}><DividerView accessibilityViewIsModal style={{...panel,width:'100%',maxWidth:440,maxHeight:'85%'}}><Text accessibilityRole="header" style={title}>{offer?'Saldo insuficiente para enviar la oferta':'Saldo insuficiente para pujar'}</Text><ScrollView><Text accessibilityRole="alert" style={text}>{message}</Text></ScrollView><Button onPress={onClose}>Entendido</Button></DividerView></View></Modal>}
