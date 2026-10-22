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

const text={color:'#dce6f2',fontSize:16,lineHeight:24};
const input={padding:16,minHeight:54,borderRadius:12,fontSize:16,color:'#fff',backgroundColor:'#0b121d',borderWidth:1,borderColor:'#647890'};
const button={padding:16,minHeight:54,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'#c52321'};
const buttonText={color:'#fff',fontSize:17,fontWeight:'700',textAlign:'center'};
const secondary={...button,backgroundColor:'#25364c',borderWidth:1,borderColor:'#647890'};
const actionStyle=disabled=>({opacity:disabled?0.45:1});
const EMAIL_KEY='villalbilla.email.link';

export default function AccessMethods({onSuccess}){
  const [method,sm]=useState('Correo y contraseña'),[email,se]=useState(''),[password,sp]=useState(''),[register,sr]=useState(false),[busy,sb]=useState(false),[message,smsg]=useState('');
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

  const passwordMethod=method==='Correo y contraseña';
  const passwordDisabled=busy||!email.trim()||password.length<(register?12:1);
  const emailDisabled=busy||!email.trim();

  return <View style={{gap:18}}>
    <GoogleSignIn onSuccess={onSuccess}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <View style={{height:1,backgroundColor:'#53667f',flex:1}}/>
      <Text style={{...text,color:'#b8c8dc',fontSize:14}}>O entra con tu correo</Text>
      <View style={{height:1,backgroundColor:'#53667f',flex:1}}/>
    </View>
    <View accessibilityRole="tablist" style={{flexDirection:'row',gap:8}}>{[
      ['Correo y contraseña','Con contraseña'],['Correo de un solo uso','Sin contraseña'],
    ].map(([value,label])=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:method===value,disabled:busy}} disabled={busy} onPress={()=>{sm(value);smsg('');sp('');sr(false)}} style={[secondary,{flex:1,paddingHorizontal:8,borderWidth:2},method===value&&{backgroundColor:'#1b2e69',borderColor:'#a8c2ff'},actionStyle(busy)]}><Text style={{...buttonText,fontSize:15}}>{label}</Text></Pressable>)}</View>
    <Text accessibilityRole="header" style={{color:'#fff',fontSize:20,fontWeight:'700'}}>{passwordMethod?(register?'Crea tu cuenta de entrenador':'Entra con correo y contraseña'):'Recibe un enlace para entrar'}</Text>
    {!passwordMethod&&<Text style={text}>Te enviaremos un enlace al correo que indiques. Ábrelo en este mismo dispositivo. No necesitas contraseña.</Text>}
    <View style={{gap:8}}>
      <Text style={{...text,fontWeight:'600'}}>Correo electrónico</Text>
      <TextInput accessibilityLabel="Correo electrónico" editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" placeholder="nombre@ejemplo.com" placeholderTextColor="#a8b9ce" value={email} onChangeText={se} style={input}/>
    </View>
    {passwordMethod?<>
      <View style={{gap:8}}>
        <Text style={{...text,fontWeight:'600'}}>{register?'Nueva contraseña':'Contraseña'}</Text>
        <TextInput accessibilityLabel={register?'Nueva contraseña':'Contraseña'} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register?'new-password':'current-password'} placeholder={register?'Mínimo 12 caracteres':'Escribe tu contraseña'} placeholderTextColor="#a8b9ce" value={password} onChangeText={sp} style={input}/>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{disabled:passwordDisabled,busy}} disabled={passwordDisabled} style={[button,actionStyle(passwordDisabled)]} onPress={submitPassword}><Text style={buttonText}>{busy?'Procesando…':register?'Crear mi cuenta':'Entrar a entrenadores'}</Text></Pressable>
      {!register&&<Pressable accessibilityRole="button" accessibilityState={{disabled:emailDisabled}} disabled={emailDisabled} style={[secondary,actionStyle(emailDisabled)]} onPress={resetPassword}><Text style={buttonText}>Recuperar mi contraseña</Text></Pressable>}
      {!register&&<Text style={{...text,fontSize:14,color:'#b8c8dc'}}>Para recuperar la contraseña, escribe primero tu correo.</Text>}
      <View style={{gap:10,paddingTop:6}}>
        <Text style={{...text,textAlign:'center'}}>{register?'¿Ya tienes una cuenta?':'¿Es la primera vez que entras?'}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{disabled:busy}} disabled={busy} style={[secondary,actionStyle(busy)]} onPress={()=>{sr(!register);smsg('');sp('')}}><Text style={buttonText}>{register?'Volver a iniciar sesión':'Crear una cuenta nueva'}</Text></Pressable>
      </View>
    </>:<Pressable accessibilityRole="button" accessibilityState={{disabled:emailDisabled,busy}} disabled={emailDisabled} style={[button,actionStyle(emailDisabled)]} onPress={sendLink}><Text style={buttonText}>{busy?'Enviando enlace…':'Enviar enlace a mi correo'}</Text></Pressable>}
    {!!message&&<View accessibilityLiveRegion="polite" style={{padding:14,borderRadius:12,backgroundColor:'#302333',borderWidth:1,borderColor:'#ba8196'}}><Text style={{...text,color:'#ffe0e7'}}>{message}</Text></View>}
    <Text style={{...text,fontSize:14,color:'#b8c8dc'}}>La sesión se guardará en este dispositivo. Si eres nuevo, el administrador del club debe aprobar tu acceso.</Text>
  </View>;
}
