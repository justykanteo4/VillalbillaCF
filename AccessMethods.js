import React,{useEffect,useState,useRef} from 'react';
import {Linking,Platform,Pressable,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth, firebaseConfigured, requestEmailLink,
} from './firebase';
import {
  createUserWithEmailAndPassword, isSignInWithEmailLink, reload,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithEmailLink, signOut,
} from 'firebase/auth';
import GoogleSignIn from './GoogleSignIn';

const text={color:'#dce6f2',lineHeight:22},input={padding:14,borderRadius:10,color:'#fff',backgroundColor:'#0b121d',borderWidth:1,borderColor:'#34475e'},button={padding:14,borderRadius:10,backgroundColor:'#25364c'};
const EMAIL_KEY='villalbilla.email.link';

export default function AccessMethods({onSuccess}){
  const [method,sm]=useState('Google'),[email,se]=useState(''),[password,sp]=useState(''),[register,sr]=useState(false),[busy,sb]=useState(false),[message,smsg]=useState('');
  const handledLinks=useRef(new Set());

  async function completeEmailLink(url){
    if(!auth||!isSignInWithEmailLink(auth,url))return false;
    if(handledLinks.current.has(url))return true;
    handledLinks.current.add(url);
    try{
    let saved=await AsyncStorage.getItem(EMAIL_KEY);
    if(Platform.OS==='web'&&!saved)saved=window.prompt('Confirma el correo al que enviamos el enlace');
    if(!saved){handledLinks.current.delete(url);smsg('Vuelve a abrir el enlace en el mismo dispositivo donde lo solicitaste.');return true;}
    const result=await signInWithEmailLink(auth,saved,url);
    await AsyncStorage.removeItem(EMAIL_KEY);
    if(Platform.OS==='web'){
      const clean=new URL(window.location.href);
      for(const key of ['apiKey','oobCode','mode','lang','continueUrl'])clean.searchParams.delete(key);
      window.history.replaceState(null,'',clean.href);
    }
    onSuccess(result.user);
    return true;
    }catch(error){handledLinks.current.delete(url);throw error;}
  }

  useEffect(()=>{
    if(!firebaseConfigured)return;
    let active=true;
    const tryLink=url=>completeEmailLink(url).catch(e=>{if(active)smsg('No se pudo validar el enlace. Solicita uno nuevo.');});
    if(Platform.OS==='web')tryLink(window.location.href);
    else Linking.getInitialURL().then(url=>{if(url)tryLink(url)}).catch(()=>{});
    const subscription=Linking.addEventListener('url',event=>tryLink(event.url));
    return()=>{active=false;subscription.remove()};
  },[firebaseConfigured]);

  async function sendLink(){
    sb(true);smsg('');
    try{
      await requestEmailLink(email);
      await AsyncStorage.setItem(EMAIL_KEY,email.trim().toLowerCase());
      smsg('Te enviamos un enlace de un solo uso. Ábrelo en este mismo móvil para entrar.');
    }catch(e){smsg(e.code==='auth/unauthorized-continue-uri'?'Falta autorizar la dirección de retorno en Firebase.':e.message||'No se pudo enviar el enlace.');}
    finally{sb(false)}
  }

  async function submitPassword(){
    sb(true);smsg('');
    try{
      const result=register
        ? await createUserWithEmailAndPassword(auth,email.trim().toLowerCase(),password)
        : await signInWithEmailAndPassword(auth,email.trim().toLowerCase(),password);
      await reload(result.user);
      if(register){
        await sendEmailVerification(result.user);
        await signOut(auth);
        sr(false);sp('');
        smsg('Cuenta creada. Verifica el correo que te enviamos y después inicia sesión.');
      }else if(!result.user.emailVerified){
        await sendEmailVerification(result.user);await signOut(auth);
        smsg('Antes de entrar, verifica el correo. Te hemos enviado otro enlace.');
      }else onSuccess(result.user);
    }catch(e){
      if(auth?.currentUser&&!auth.currentUser.emailVerified)await signOut(auth).catch(()=>{});
      const messages={
        'auth/invalid-credential':'Correo o contraseña incorrectos.',
        'auth/email-already-in-use':'Ya existe una cuenta con ese correo. Inicia sesión.',
        'auth/weak-password':'La contraseña debe tener al menos 12 caracteres.',
        'auth/invalid-email':'Escribe un correo válido.',
        'auth/network-request-failed':'No hay conexión. Comprueba internet e inténtalo de nuevo.',
      };
      smsg(messages[e.code]||e.message||'No se pudo iniciar sesión.');
    }finally{sb(false)}
  }

  async function resetPassword(){
    sb(true);smsg('');
    try{await sendPasswordResetEmail(auth,email.trim().toLowerCase());smsg('Te enviamos un enlace para cambiar la contraseña.');}
    catch(e){smsg(e.code==='auth/invalid-email'?'Escribe un correo válido.':e.message||'No se pudo enviar el correo.');}
    finally{sb(false)}
  }

  if(!firebaseConfigured)return <Text style={text}>Firebase aún no está conectado. Cuando se añada la configuración del club, aquí se activarán los inicios de sesión.</Text>;

  return <View style={{gap:16}}>
    <Text style={text}>La sesión se conservará en este dispositivo. Las solicitudes nuevas las aprueba el administrador del club.</Text>
    <View style={{gap:8}}>{['Google','Correo de un solo uso','Correo y contraseña'].map(m=><Pressable key={m} accessibilityRole="button" accessibilityState={{selected:method===m}} onPress={()=>{sm(m);smsg('');sp('')}} style={[button,method===m&&{backgroundColor:'#b42122'}]}><Text style={text}>{m}</Text></Pressable>)}</View>
    {method==='Google'?<GoogleSignIn onSuccess={onSuccess}/>:<>
      <TextInput accessibilityLabel="Correo de acceso" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Tu correo electrónico" placeholderTextColor="#91a5be" value={email} onChangeText={se} style={input}/>
      {method==='Correo y contraseña'?<>
        <TextInput accessibilityLabel="Contraseña de acceso" secureTextEntry autoCapitalize="none" placeholder={register?'Contraseña nueva (mínimo 12 caracteres)':'Contraseña'} placeholderTextColor="#91a5be" value={password} onChangeText={sp} style={input}/>
        <Pressable onPress={()=>{sr(!register);smsg('');sp('')}}><Text style={{color:'#91adff'}}>{register?'Ya tengo cuenta':'Crear cuenta'}</Text></Pressable>
        {!register&&<Pressable disabled={busy} onPress={resetPassword}><Text style={{color:'#91adff'}}>He olvidado mi contraseña</Text></Pressable>}
        <Pressable accessibilityRole="button" disabled={busy||!email||password.length<(register?12:1)} style={[button,{backgroundColor:'#b42122'}]} onPress={submitPassword}><Text style={text}>{busy?'Procesando…':register?'Crear cuenta':'Entrar'}</Text></Pressable>
      </>:<Pressable accessibilityRole="button" disabled={busy||!email} style={[button,{backgroundColor:'#b42122'}]} onPress={sendLink}><Text style={text}>{busy?'Enviando…':'Enviar enlace de un solo uso'}</Text></Pressable>}
    </>}
    {!!message&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{message}</Text>}
  </View>;
}
