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
  return <View style={{gap:12}}><Pressable accessibilityRole="button" accessibilityState={{disabled:busy,busy}} disabled={busy} onPress={login} style={({pressed})=>({padding:16,minHeight:56,borderRadius:12,backgroundColor:pressed?'#e1e8f0':'#fff',borderWidth:1,borderColor:'#b8c8dc',alignItems:'center',justifyContent:'center',opacity:busy?0.6:1})}><Text style={{color:'#162235',fontSize:18,fontWeight:'700',textAlign:'center'}}>{busy?'Abriendo Google…':'Entrar con Google'}</Text></Pressable>{!!error&&<Text accessibilityLiveRegion="polite" style={{color:'#ffc1c9',fontSize:16,lineHeight:24}}>{error}</Text>}</View>;
}
