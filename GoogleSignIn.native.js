import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {GoogleSignin,isSuccessResponse} from '@react-native-google-signin/google-signin';
import {GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {auth} from './firebase';
import {googleLoginError} from './native-errors.cjs';

const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
if(webClientId)GoogleSignin.configure({webClientId,iosClientId,scopes:['openid','profile','email']});

export default function GoogleSignIn({onSuccess}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);

  async function login(){
    if(!webClientId){setError('El acceso con Google no está disponible en esta versión. Actualiza la app o entra con correo y contraseña.');return;}
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
      setError(googleLoginError(e));
    }finally{setBusy(false)}
  }

  return <View style={{gap:12}}><Pressable accessibilityRole="button" disabled={busy} onPress={login} style={{padding:14,borderRadius:12,backgroundColor:'#c52321',alignItems:'center',opacity:busy?0.65:1}}><Text style={{color:'#fff',fontWeight:'700'}}>{busy?'Abriendo Google…':'Continuar con Google'}</Text></Pressable>{!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}</View>;
}
