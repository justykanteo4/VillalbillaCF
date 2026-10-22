import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {GoogleSignin,isSuccessResponse} from '@react-native-google-signin/google-signin';
import {GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {auth} from './firebase';

const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
if(webClientId)GoogleSignin.configure({webClientId,iosClientId,scopes:['openid','profile','email']});

export default function GoogleSignIn({onSuccess}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);

  async function login(){
    if(!webClientId){setError('Falta el cliente web de Google en la configuración del club.');return;}
    if(!auth){setError('Firebase todavía no está conectado.');return;}
    setBusy(true);setError('');
    try{
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      const response=await GoogleSignin.signIn();
      if(!isSuccessResponse(response))return;
      const idToken=response.data.idToken;
      if(!idToken)throw Error('Google no devolvió un token de identidad. Revisa el cliente web OAuth.');
      const result=await signInWithCredential(auth,GoogleAuthProvider.credential(idToken));
      onSuccess(result.user);
    }catch(e){
      if(e?.code==='SIGN_IN_CANCELLED')return;
      setError(e.message||'No se pudo iniciar sesión con Google.');
    }finally{setBusy(false)}
  }

  return <View style={{gap:12}}><Pressable accessibilityRole="button" disabled={busy} onPress={login} style={{padding:14,borderRadius:12,backgroundColor:'#c52321',alignItems:'center',opacity:busy?0.65:1}}><Text style={{color:'#fff',fontWeight:'700'}}>{busy?'Abriendo Google…':'Continuar con Google'}</Text></Pressable>{!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}</View>;
}
