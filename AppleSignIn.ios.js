import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {OAuthProvider,signInWithCredential,updateProfile} from 'firebase/auth';
import {auth} from './firebase';
export default function AppleSignIn({onSuccess}){
 const [available,setAvailable]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;AppleAuthentication.isAvailableAsync().then(value=>{if(active)setAvailable(value)}).catch(()=>{});return()=>{active=false}},[]);
 async function login(){if(busy)return;setBusy(true);setError('');try{if(!auth)throw Error('Firebase todavía no está conectado.');const rawNonce=Crypto.randomUUID(),nonce=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,rawNonce);const response=await AppleAuthentication.signInAsync({requestedScopes:[AppleAuthentication.AppleAuthenticationScope.FULL_NAME,AppleAuthentication.AppleAuthenticationScope.EMAIL],nonce});if(!response.identityToken)throw Error('Apple no devolvió la identidad. Vuelve a intentarlo.');const credential=new OAuthProvider('apple.com').credential({idToken:response.identityToken,rawNonce});const result=await signInWithCredential(auth,credential);const name=[response.fullName?.givenName,response.fullName?.familyName].filter(Boolean).join(' ');if(name&&!result.user.displayName)await updateProfile(result.user,{displayName:name});onSuccess(result.user)}catch(e){if(e.code!=='ERR_REQUEST_CANCELED')setError(e.code==='auth/operation-not-allowed'?'El acceso con Apple todavía no está activado en Firebase.':e.code==='auth/account-exists-with-different-credential'?'Este correo ya tiene una cuenta. Entra con el método que usaste al registrarte.':e.message||'No se pudo iniciar sesión con Apple.')}finally{setBusy(false)}}
 if(!available)return null;
 return <View style={{gap:12,opacity:busy?0.65:1}}><AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE} cornerRadius={12} style={{height:50,width:'100%'}} onPress={login}/>{busy&&<Text style={{color:'#dce6f2'}}>Abriendo Apple…</Text>}{!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}</View>;
}
