import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {auth} from './firebase';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignIn({onSuccess}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const androidClientId=process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const [request,response,promptAsync]=Google.useIdTokenAuthRequest({androidClientId,iosClientId,webClientId,scopes:['openid','profile','email']});

  useEffect(()=>{
    if(response?.type!=='success')return;
    const idToken=response.params?.id_token||response.authentication?.idToken;
    if(!idToken||!auth){setError('Google no devolvió un token válido. Revisa los clientes OAuth.');setBusy(false);return;}
    signInWithCredential(auth,GoogleAuthProvider.credential(idToken)).then(result=>onSuccess(result.user)).catch(e=>setError(e.message||'No se pudo validar la cuenta de Google.')).finally(()=>setBusy(false));
  },[response]);

  async function login(){
    if(!androidClientId||!iosClientId){setError('Faltan los clientes OAuth de Android e iOS en la configuración de Google del club.');return;}
    setBusy(true);setError('');
    try{const result=await promptAsync();if(result.type==='error'||result.type==='dismiss'||result.type==='cancel')setBusy(false);}
    catch(e){setBusy(false);setError(e.message||'No se pudo abrir Google.');}
  }

  return <View style={{gap:12}}><Pressable accessibilityRole="button" disabled={busy||!request} onPress={login} style={{padding:14,borderRadius:12,backgroundColor:'#c52321',alignItems:'center',opacity:busy||!request?.url?0.65:1}}><Text style={{color:'#fff',fontWeight:'700'}}>{busy?'Abriendo Google…':'Continuar con Google'}</Text></Pressable>{!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}</View>;
}
