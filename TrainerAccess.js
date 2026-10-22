import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';
import {api} from './api';
import AccessMethods from './AccessMethods';
import teams from './teams.json';
import {
  adminEmail,auth,claimTeam,decideRequest,firebaseConfigured,
  getProfile,onAuthStateChanged,signOut,watchProfile,watchProfiles,
} from './firebase';

const text={color:'#dce6f2',lineHeight:22},button={padding:14,borderRadius:10,backgroundColor:'#1b2e69'};
const labels={pending:'Pendiente',approved:'Aprobado',revoked:'Retirado',rejected:'Rechazado',unassigned:'Sin solicitud'};

export default function TrainerAccess({onSuccess}){
  const [authUser,su]=useState(auth?.currentUser||null),[user,sprofile]=useState(null),[team,sc]=useState('680163'),[name,sn]=useState(''),[roster,sr]=useState([]),[requests,sq]=useState([]),[error,se]=useState('');

  useEffect(()=>{
    if(!firebaseConfigured||!auth)return;
    let active=true,revision=0;
    const unsubscribe=onAuthStateChanged(auth,async next=>{
      const current=++revision;
      su(next?.emailVerified?next:null);sprofile(null);sq([]);se('');
      if(next?.emailVerified)try{const profile=await getProfile(next);if(active&&current===revision)sprofile(profile)}catch(e){if(active&&current===revision)se(e.message||'No se pudo cargar tu perfil.');}
    });
    return()=>{active=false;revision++;unsubscribe()};
  },[]);

  useEffect(()=>{
    if(!authUser||!user||user.status!=='admin')return;
    return watchProfiles(list=>sq(list.filter(item=>item.email?.toLowerCase()!==adminEmail)),e=>se(e.message||'No se pudieron cargar las solicitudes.'));
  },[authUser,user?.status]);

  useEffect(()=>{
    if(!authUser||user?.status==='admin')return;
    return watchProfile(authUser,profile=>sprofile(profile),e=>se(e.message||'No se pudo actualizar tu solicitud.'));
  },[authUser,user?.status]);

  useEffect(()=>{
    if(!authUser||user?.status==='admin')return;
    let active=true;sr([]);sn('');
    api('/api/team-staff?team='+encodeURIComponent(team)).then(d=>{if(active)sr(d.people||[])}).catch(()=>{});
    return()=>{active=false};
  },[team,authUser,user?.status]);

  async function submitClaim(){
    try{const selected=teams.find(item=>item.id===team);sprofile(await claimTeam(authUser,selected,name));se('');}
    catch(e){se(e.message||'No se pudo enviar la solicitud.');}
  }

  async function action(id,decision){try{await decideRequest(id,decision)}catch(e){se(e.message||'No se pudo guardar la decisión.');}}

  async function logout(){try{await signOut(auth)}catch{}su(null);sprofile(null);sq([]);}

  if(!firebaseConfigured)return <View style={{padding:22,gap:14,backgroundColor:'#151f2d',borderRadius:20}}><Text style={{fontSize:25,fontWeight:'800',color:'#fff'}}>Área de entrenadores</Text><Text style={text}>Firebase aún no está conectado. Al añadir los datos del proyecto del club se activará el registro y se guardarán las solicitudes en la nube.</Text></View>;

  return <View style={{padding:22,gap:18,backgroundColor:'#151f2d',borderRadius:20}}>
    <Text style={{fontSize:25,fontWeight:'800',color:'#fff'}}>Área de entrenadores</Text>
    {!authUser?<><Text style={text}>Entra con tu cuenta. Después elige tu equipo y quién eres en el cuerpo técnico. El administrador del club aprobará tu acceso.</Text><AccessMethods onSuccess={async signedIn=>{su(signedIn);try{sprofile(await getProfile(signedIn))}catch(e){se(e.message||'No se pudo crear tu perfil.');}}}/></>:!user?<Text style={text}>Comprobando tu cuenta…</Text>:<>
      <Text style={text}>{user.name||authUser.displayName||authUser.email} · {user.email||authUser.email}</Text>
      {user.status==='admin'?<>
        <Text style={{...text,color:'#91adff',fontWeight:'800'}}>ADMINISTRADOR DEL CLUB</Text>
        <Text style={text}>Aprueba las solicitudes después de comprobar la identidad y el equipo de cada entrenador.</Text>
        {!requests.length&&<Text style={text}>No hay solicitudes.</Text>}
        {requests.map(r=><View key={r.id} style={{gap:10,padding:14,backgroundColor:'#0b121d',borderRadius:12}}>
          <Text style={text}>{r.name} · {r.email}</Text><Text style={text}>{r.claim?.name||'Sin identidad seleccionada'} · {r.claim?.category||'Sin equipo'}</Text><Text style={text}>Estado: {labels[r.status]||r.status}</Text>
          {r.status==='pending'&&<><Pressable style={button} onPress={()=>action(r.id,'approve')}><Text style={text}>Aprobar acceso</Text></Pressable><Pressable style={button} onPress={()=>action(r.id,'reject')}><Text style={text}>Rechazar solicitud</Text></Pressable></>}
          {r.status==='approved'&&<Pressable style={button} onPress={()=>action(r.id,'revoke')}><Text style={text}>Retirar acceso</Text></Pressable>}
        </View>)}
        <Pressable style={button} onPress={()=>onSuccess(user)}><Text style={text}>Entrar a la gestión del equipo</Text></Pressable>
      </>:user.status==='approved'?<><Text style={text}>Acceso aprobado: {user.claim?.category} · {user.claim?.name}</Text><Pressable style={button} onPress={()=>onSuccess(user)}><Text style={text}>Entrar a mi equipo</Text></Pressable></>:user.status==='pending'?<Text style={text}>Tu solicitud para {user.claim?.category} está pendiente de aprobación por el administrador. Se actualizará automáticamente.</Text>:<>
        <Text style={text}>{user.status==='revoked'?'Tu acceso ha sido retirado. Puedes solicitar una nueva revisión.':user.status==='rejected'?'La solicitud ha sido rechazada. Comprueba tu identidad y equipo antes de volver a solicitarlo.':'Selecciona tu equipo y tu identidad.'}</Text>
        {teams.map(t=><Pressable key={t.id} style={[button,team===t.id&&{backgroundColor:'#b42122'}]} onPress={()=>sc(t.id)}><Text style={text}>{t.category} {t.name.match(/'([^']+)'/)?.[1]||''}</Text></Pressable>)}
        <Text style={text}>¿Quién eres dentro del cuerpo técnico?</Text>{roster.map((r,i)=><Pressable key={i} style={[button,name===r.name&&{backgroundColor:'#b42122'}]} onPress={()=>sn(r.name)}><Text style={text}>{r.name} · {r.role||'Cuerpo técnico'}</Text></Pressable>)}
        <Text style={text}>Si no apareces todavía, indica tu nombre para que el administrador lo revise.</Text><TextInput placeholder="Tu nombre en el cuerpo técnico" placeholderTextColor="#91a5be" style={{...text,padding:14,backgroundColor:'#0b121d',borderRadius:10}} value={name} onChangeText={sn}/>
        <Pressable style={button} onPress={submitClaim}><Text style={text}>Solicitar acceso a este equipo</Text></Pressable>
      </>}
      <Pressable onPress={logout}><Text style={{color:'#ffc1c9'}}>Cerrar sesión</Text></Pressable>
    </>}
    {!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}
  </View>;
}
