import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {GoogleAuthProvider,signInWithPopup} from 'firebase/auth';
import {auth} from './firebase';

export default function GoogleSignIn({onSuccess}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function login(){
    if(!auth){setError('Firebase todavía no está conectado.');return;}
    setBusy(true);setError('');
    try{const result=await signInWithPopup(auth,new GoogleAuthProvider());onSuccess(result.user);}
    catch(e){setError(e.code==='auth/popup-closed-by-user'?'Se cerró el inicio de sesión. Inténtalo otra vez.':e.message||'No se pudo iniciar sesión con Google.');}
    finally{setBusy(false)}
  }
  return <View style={{gap:12}}><Pressable accessibilityRole="button" disabled={busy} onPress={login} style={{padding:14,borderRadius:12,backgroundColor:'#c52321',alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>{busy?'Abriendo Google…':'Continuar con Google'}</Text></Pressable>{!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}</View>;
}
