import React,{useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth, firebaseConfigured,
} from './firebase';
import {
  createUserWithEmailAndPassword, reload,
  getIdToken, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import AppleSignIn from './AppleSignIn';
import GoogleSignIn from './GoogleSignIn';

const text={color:'#dce6f2',lineHeight:22},input={padding:14,borderRadius:10,color:'#fff',backgroundColor:'#0b121d',borderWidth:1,borderColor:'#34475e',minHeight:50},button={padding:14,borderRadius:10,backgroundColor:'#25364c',alignItems:'center'};
const REMEMBERED_EMAIL_KEY='villalbilla.remembered.email';

export default function AccessMethods({onSuccess}){
  const [email,se]=useState(''),[password,sp]=useState(''),[register,sr]=useState(false),[busy,sb]=useState(false),[message,smsg]=useState(''),[remember,sremember]=useState(false),[showPassword,ssh]=useState(false);

  useEffect(()=>{let active=true;AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).then(saved=>{if(active&&saved){se(saved);sremember(true)}}).catch(()=>{});return()=>{active=false}},[]);

  async function toggleRemember(){
    const next=!remember;sremember(next);
    try{if(next){if(email.trim())await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY,email.trim().toLowerCase())}else await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY)}catch{}
  }

  function changeEmail(value){
    se(value);
    if(remember){const normalized=value.trim().toLowerCase();if(normalized)AsyncStorage.setItem(REMEMBERED_EMAIL_KEY,normalized).catch(()=>{});else AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY).catch(()=>{})}
  }

  async function submitPassword(){
    sb(true);smsg('');
    try{
      if(remember)await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY,email.trim().toLowerCase());
      else await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      const result=register
        ? await createUserWithEmailAndPassword(auth,email.trim().toLowerCase(),password)
        : await signInWithEmailAndPassword(auth,email.trim().toLowerCase(),password);
      await reload(result.user);
      await getIdToken(result.user,true);
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
      const messages={
        'auth/invalid-credential':'No coincide el correo o la contraseña. Si creaste la cuenta con Google, entra por ese método y añade una contraseña desde tu perfil. Si eres nuevo, pulsa «Crear cuenta» y verifica el correo.',
        'auth/wrong-password':'La contraseña no es correcta. Si creaste la cuenta con Google, entra por ese método y añade una contraseña desde tu perfil.',
        'auth/email-already-in-use':'Ese correo ya tiene cuenta. Pulsa «Ya tengo cuenta» y entra; crear la cuenta no envía la solicitud al administrador. Después elige equipo y nombre y pulsa «Solicitar acceso a este equipo».',
        'auth/weak-password':'La contraseña debe tener al menos 12 caracteres.',
        'auth/invalid-email':'Escribe un correo válido.',
        'auth/network-request-failed':'No hay conexión. Comprueba internet e inténtalo de nuevo.',
        'auth/operation-not-allowed':'El acceso con correo y contraseña no está habilitado en Firebase. Activa el proveedor Correo electrónico/contraseña.',
        'auth/too-many-requests':'Firebase ha bloqueado temporalmente los intentos. Espera un poco y vuelve a probar.',
        'auth/user-disabled':'Esta cuenta está desactivada. Contacta con el administrador del club.',
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

  return <View style={{gap:14}}>
    <Text style={text}>Inicia sesión con tu correo y contraseña. También puedes entrar con Google.</Text>
    <TextInput accessibilityLabel="Correo de acceso" autoCapitalize="none" autoComplete="email" textContentType="username" keyboardType="email-address" returnKeyType="next" placeholder="Correo electrónico" placeholderTextColor="#91a5be" value={email} onChangeText={changeEmail} style={input}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
        <TextInput accessibilityLabel="Contraseña de acceso" secureTextEntry={!showPassword} autoCapitalize="none" textContentType={register?'newPassword':'password'} returnKeyType="done" placeholder={register?'Contraseña nueva (mínimo 12 caracteres)':'Contraseña'} placeholderTextColor="#91a5be" value={password} onChangeText={sp} style={[input,{flex:1,minWidth:0}]}/>
        <Pressable accessibilityRole="button" accessibilityLabel={showPassword?'Ocultar contraseña':'Mostrar contraseña'} onPress={()=>ssh(value=>!value)} style={{padding:8}}><Text style={{color:'#91adff',fontWeight:'700'}}>{showPassword?'Ocultar':'Mostrar'}</Text></Pressable>
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:remember}} onPress={toggleRemember} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:3}}>
        <View style={{width:22,height:22,borderRadius:5,borderWidth:1,borderColor:remember?'#91adff':'#718198',backgroundColor:remember?'#1b2e69':'transparent',alignItems:'center',justifyContent:'center'}}>{remember&&<Text style={{color:'#fff',fontWeight:'800'}}>✓</Text>}</View>
        <Text style={text}>Recordar usuario</Text>
      </Pressable>
      {register&&<Text style={text}>Crear la cuenta no envía todavía una solicitud. Después verifica el correo, inicia sesión, elige equipo y nombre, y pulsa «Solicitar acceso a este equipo».</Text>}
      <Pressable onPress={()=>{sr(!register);smsg('');sp('')}}><Text style={{color:'#91adff'}}>{register?'Ya tengo cuenta':'Crear cuenta'}</Text></Pressable>
      {!register&&<Pressable disabled={busy} onPress={resetPassword}><Text style={{color:'#91adff'}}>He olvidado mi contraseña</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={busy||!email||password.length<(register?12:1)} style={[button,{backgroundColor:'#b42122',opacity:(busy||!email||password.length<(register?12:1)) ? 0.65 : 1}]} onPress={submitPassword}><Text style={text}>{busy?'Procesando…':register?'Crear cuenta':'Iniciar sesión'}</Text></Pressable>
      <View style={{height:1,backgroundColor:'#34475e',marginVertical:2}}/>
      <GoogleSignIn onSuccess={onSuccess}/>
      <AppleSignIn onSuccess={onSuccess}/>
    {!!message&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{message}</Text>}
  </View>;
}
