import React,{useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {GoogleAuthProvider,signInWithCredential,signInWithPopup} from 'firebase/auth';
import {GoogleSignin,statusCodes} from '@react-native-google-signin/google-signin';
import {auth} from './firebase';

const webClientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if(Platform.OS!=='web'&&webClientId){
  GoogleSignin.configure({
    webClientId,
    iosClientId:process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

export default function GoogleSignIn({onSuccess}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function login(){
    if(!auth){setError('Firebase todavía no está conectado.');return;}
    setBusy(true);setError('');
    try{
      if(Platform.OS==='web'){
        const result=await signInWithPopup(auth,new GoogleAuthProvider());
        onSuccess(result.user);
        return;
      }

      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
      const response=await GoogleSignin.signIn();
      if(response.type!=='success')return;
      if(!response.data.idToken)throw Error('Google no devolvió un token válido. Comprueba la configuración OAuth de Android o iOS.');
      const credential=GoogleAuthProvider.credential(response.data.idToken);
      const result=await signInWithCredential(auth,credential);
      onSuccess(result.user);
    }catch(e){
      if(e.code===statusCodes.SIGN_IN_CANCELLED||e.code==='auth/popup-closed-by-user')setError('Se cerró el inicio de sesión. Inténtalo otra vez.');
      else if(e.code===statusCodes.PLAY_SERVICES_NOT_AVAILABLE)setError('Actualiza o instala Google Play Services y vuelve a intentarlo.');
      else if(e.code==='auth/invalid-credential')setError('Google rechazó el acceso. Falta revisar el cliente OAuth y la firma de esta app en Firebase.');
      else setError(e.message||'No se pudo iniciar sesión con Google.');
    }finally{setBusy(false)}
  }
  return <View style={{gap:12}}><Pressable accessibilityRole="button" disabled={busy} onPress={login} style={{padding:14,borderRadius:12,backgroundColor:'#c52321',alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>{busy?'Abriendo Google…':'Continuar con Google'}</Text></Pressable>{!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}</View>;
}
