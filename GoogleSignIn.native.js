import React,{useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {GoogleSignin,isSuccessResponse} from '@react-native-google-signin/google-signin';
import {GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {auth} from './firebase';
import {nativeGoogleOptions} from './native-google-config.cjs';

const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export default function GoogleSignIn({onSuccess}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);

  async function login(){
    if(!auth){setError('Firebase todavía no está conectado.');return;}
    setBusy(true);setError('');
    try{
      const options=nativeGoogleOptions(Platform.OS,webClientId,iosClientId);
      if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      GoogleSignin.configure(options);
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

  return <View style={{gap:12}}><Pressable accessibilityRole="button" accessibilityState={{disabled:busy,busy}} disabled={busy} onPress={login} style={({pressed})=>({padding:16,minHeight:56,borderRadius:12,backgroundColor:pressed?'#e1e8f0':'#fff',borderWidth:1,borderColor:'#b8c8dc',alignItems:'center',justifyContent:'center',opacity:busy?0.6:1})}><Text style={{color:'#162235',fontSize:18,fontWeight:'700',textAlign:'center'}}>{busy?'Abriendo Google…':'Entrar con Google'}</Text></Pressable>{!!error&&<Text accessibilityLiveRegion="polite" style={{color:'#ffc1c9',fontSize:16,lineHeight:24}}>{error}</Text>}</View>;
}
