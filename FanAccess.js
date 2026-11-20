import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import AccessMethods from './AccessMethods';
import {auth,onAuthStateChanged,getProfile,watchProfile,claimFanAccess} from './firebase';
import {registerAccessPush} from './access-notifications';

const text={color:'#eaf0fa',lineHeight:22};
const button={padding:14,borderRadius:10,backgroundColor:'#1b2e69'};
export default function FanAccess({onApproved,onChangeRole}){
 const [user,setUser]=useState(auth?.currentUser?.isAnonymous?null:auth?.currentUser||null);
 const [profile,setProfile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!auth)return;
  let active=true,revision=0,stopProfile=()=>{};
  const stop=onAuthStateChanged(auth,async next=>{
   const turn=++revision;stopProfile();setProfile(null);setError('');
   if(next?.isAnonymous)next=null;setUser(next);
   if(!next)return;
   try{
    const value=await getProfile(next);
    if(!active||turn!==revision)return;
    setProfile(value);
    stopProfile=watchProfile(next,p=>{if(active&&turn===revision)setProfile(p)},e=>{if(active&&turn===revision)setError(e.message)});
   }catch(e){if(active&&turn===revision)setError(e.message)}
  });
  return()=>{active=false;stopProfile();stop()};
 },[]);
 useEffect(()=>{if(profile&&['approved','admin'].includes(profile.status)&&profile.claim?.role==='fan')onApproved?.(profile)},[profile?.status,profile?.claim?.role]);
 async function request(){
  if(!user||busy)return;setBusy(true);setError('');
  try{
   const value=await claimFanAccess(user);setProfile(value);
   registerAccessPush({admin:false}).catch(()=>{});
  }catch(e){setError(e.message||'No se pudo enviar la solicitud de hincha.')}
  finally{setBusy(false)}
 }
 const approved=profile?.status==='approved'||profile?.status==='admin';
 return <View style={{gap:16,padding:18,backgroundColor:'#111820',borderRadius:12}}>
  <Text style={{...text,fontSize:24,fontWeight:'800'}}>❤️ Acceso de hinchas</Text>
  {!user?<><Text style={text}>Introduce tu correo electrónico y contraseña, o crea una cuenta. Para registrarte debes verificar el enlace enviado a tu correo.</Text><AccessMethods onSuccess={setUser}/></>:
   !profile?<Text style={text}>Comprobando tu cuenta…</Text>:
   approved?<><Text style={text}>Cuenta aprobada por el club. Ya puedes participar en las votaciones.</Text><Pressable accessibilityRole="button" onPress={()=>onApproved?.(profile)} style={button}><Text style={text}>Entrar al club</Text></Pressable></>:
   profile.status==='pending'?<><Text style={text}>Correo: {user.email}</Text><Text style={text}>Tu solicitud de hincha está pendiente de validación por el administrador. Hasta entonces no puedes votar.</Text></>:
   <><Text style={text}>Correo: {user.email}</Text><Text style={text}>Después de verificar tu correo, solicita la aprobación del club para votar.</Text><Pressable accessibilityRole="button" onPress={request} disabled={busy} style={button}><Text style={text}>{busy?'Enviando…':'Solicitar acceso como hincha'}</Text></Pressable></>}
  {!!error&&<Text accessibilityRole="alert" style={{color:'#ffc1c9'}}>{error}</Text>}
  <Pressable accessibilityRole="button" onPress={onChangeRole} style={button}><Text style={text}>Cambiar tipo de usuario</Text></Pressable>
 </View>;
}
