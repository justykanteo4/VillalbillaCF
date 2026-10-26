import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView} from 'react-native';
import {api} from './api';
import AccessMethods from './AccessMethods';
import TeamSelector from './TeamSelector';
import teams from './teams.json';
import {
  adminEmails,auth,claimPlayer,claimTeam,decideRequest,firebaseConfigured,
  getProfile,getProfiles,onAuthStateChanged,signOut,watchProfile,watchProfiles,
} from './firebase';
import {EmailAuthProvider,linkWithCredential,updatePassword} from 'firebase/auth';

const text={color:'#dce6f2',lineHeight:22},button={padding:14,borderRadius:10,backgroundColor:'#1b2e69'};
const labels={pending:'Pendiente',approved:'Aprobado',revoked:'Retirado',rejected:'Rechazado',unassigned:'Sin solicitud'};

function AddPassword({user}){
  const [password,sp]=useState(''),[busy,sb]=useState(false),[message,sm]=useState('');
  const [linked,sl]=useState(false);
  if(!user?.email)return null;
  async function save(){
    sb(true);sm('');
    try{
      try{await linkWithCredential(user,EmailAuthProvider.credential(user.email,password))}
      catch(error){if(error.code!=='auth/provider-already-linked')throw error;await updatePassword(user,password)}
      sl(true);sp('');sm('Contraseña añadida. Ya puedes entrar con Google o con correo y contraseña.');
    }catch(e){
      const messages={
        'auth/weak-password':'La contraseña debe tener al menos 12 caracteres.',
        'auth/provider-already-linked':'Esta cuenta ya tiene una contraseña vinculada.',
        'auth/email-already-in-use':'Ese correo ya está asociado a otra cuenta de Firebase.',
        'auth/credential-already-in-use':'Esa contraseña ya pertenece a otra cuenta de Firebase.',
        'auth/requires-recent-login':'Vuelve a iniciar sesión con Google y prueba de nuevo.',
      };
      sm(messages[e.code]||'No se pudo añadir la contraseña. Vuelve a iniciar sesión con Google y prueba de nuevo.');
    }finally{sb(false)}
  }
  if(linked)return <View style={{padding:14,backgroundColor:'#0b121d',borderRadius:12}}><Text style={text}>Contraseña añadida. Ya puedes entrar con Google o con correo y contraseña.</Text></View>;
  return <View style={{gap:10,padding:14,backgroundColor:'#0b121d',borderRadius:12}}>
    <Text style={text}>Añade o cambia la contraseña de esta cuenta para entrar también con «Correo y contraseña».</Text>
    <TextInput accessibilityLabel="Nueva contraseña" secureTextEntry autoCapitalize="none" placeholder="Nueva contraseña (mínimo 12 caracteres)" placeholderTextColor="#91a5be" value={password} onChangeText={sp} style={{...text,padding:14,backgroundColor:'#151f2d',borderRadius:10}}/>
    <Pressable accessibilityRole="button" disabled={busy||password.length<12} style={[button,{opacity:busy||password.length<12 ? .55 : 1}]} onPress={save}><Text style={text}>{busy?'Guardando…':'Añadir contraseña a esta cuenta'}</Text></Pressable>
    {!!message&&<Text style={text}>{message}</Text>}
  </View>;
}

export default function TrainerAccess({onSuccess,role='trainer',initialTeamId='680163'}){
  const [assignments,setAssignments]=useState([]);
  const [authUser,su]=useState(auth?.currentUser?.isAnonymous?null:auth?.currentUser||null),[user,sprofile]=useState(null),[team,sc]=useState(initialTeamId),[teamPicker,stp]=useState(false),[name,sn]=useState(''),[roster,sr]=useState([]),[playerRoster,spr]=useState([]),[selectedPlayer,ssp]=useState(null),[requests,sq]=useState([]),[error,se]=useState(''),[notice,snotice]=useState(''),[busy,sbusy]=useState(false);

  useEffect(()=>{
    if(!firebaseConfigured||!auth)return;
    return onAuthStateChanged(auth,async next=>{
      if(next?.isAnonymous)next=null;su(next);sprofile(null);sq([]);se('');
      if(next)try{sprofile(await getProfile(next))}catch(e){se(e.message||'No se pudo cargar tu perfil.');}
    });
  },[]);

  useEffect(()=>{
    if(!authUser||!user||user.status!=='admin')return;
    return watchProfiles(list=>sq(list.filter(item=>!adminEmails.includes(item.email?.toLowerCase()))),e=>se(e.message||'No se pudieron cargar las solicitudes.'));
  },[authUser,user?.status]);

  useEffect(()=>{
    if(!authUser||user?.status==='admin')return;
    return watchProfile(authUser,profile=>sprofile(profile),e=>se(e.message||'No se pudo actualizar tu solicitud.'));
  },[authUser,user?.status]);

  useEffect(()=>{
    if(!authUser||user?.status==='admin')return;
    let active=true;sr([]);sn('');
    api('/api/team-staff?team='+encodeURIComponent(team),{onUpdate:value=>{if(active)sr(value.people||[])}}).then(d=>{if(active)sr(d.people||[])}).catch(()=>{});
    return()=>{active=false};
  },[team,authUser,user?.status,role]);

  useEffect(()=>{
    if(role!=='player'||!authUser||!user||['admin','approved','pending'].includes(user.status))return;
    let active=true;spr([]);ssp(null);
    api('/api/players?team='+encodeURIComponent(team),{onUpdate:value=>{if(active)spr(value.players||[])}}).then(d=>{if(active)spr(d.players||[])}).catch(e=>{if(active)se(e.message||'No se pudo consultar la plantilla oficial.')});
    return()=>{active=false};
  },[team,authUser,user?.status,role]);

  useEffect(()=>{if(user?.status==='approved')onSuccess(user)},[user?.status,user?.claim?.role]);

  async function submitClaim(){
    sbusy(true);se('');snotice('');
    try{const first=!name.trim()?assignments[0]:null;const selected=teams.find(item=>item.id===(first?.teamId||team));sprofile(await claimTeam(authUser,selected,first?.name||name,!name.trim()||assignments.some(t=>t.teamId===team)?assignments:[...assignments,{teamId:team,name:name.trim(),category:selected.category,teamName:selected.name}]));snotice('Solicitud enviada y guardada. El administrador ya puede aceptarla en «Solicitudes».');}
    catch(e){se(e.message||'No se pudo enviar la solicitud.');}
    finally{sbusy(false)}
  }

  async function submitPlayerClaim(){
    if(!selectedPlayer){se('Selecciona tu ficha en la plantilla oficial.');return;}
    sbusy(true);se('');snotice('');
    try{const selected=teams.find(item=>item.id===team);sprofile(await claimPlayer(authUser,selected,selectedPlayer));snotice('Solicitud de jugador enviada. El administrador ya puede aceptarla en «Solicitudes».');}
    catch(e){se(e.message||'No se pudo enviar la solicitud.');}
    finally{sbusy(false)}
  }

  async function action(id,decision){try{await decideRequest(id,decision)}catch(e){se(e.message||'No se pudo guardar la decisión.');}}

  async function refreshRequests(){
    sbusy(true);se('');
    try{const list=await getProfiles();sq(list.filter(item=>!adminEmails.includes(item.email?.toLowerCase())));}
    catch(e){se(e.message||'No se pudieron actualizar las solicitudes.');}
    finally{sbusy(false)}
  }

  async function refreshMyRequest(){
    sbusy(true);se('');
    try{sprofile(await getProfile(authUser));}
    catch(e){se(e.message||'No se pudo comprobar la solicitud.');}
    finally{sbusy(false)}
  }

  async function logout(){try{await signOut(auth)}catch{}su(null);sprofile(null);sq([]);}

  if(!firebaseConfigured)return <View style={{padding:22,gap:14,backgroundColor:'#151f2d',borderRadius:20}}><Text style={{fontSize:25,fontWeight:'800',color:'#fff'}}>Acceso de {role==='player'?'jugador':'entrenador'}</Text><Text style={text}>Firebase aún no está conectado. Al añadir los datos del proyecto del club se activará el inicio de sesión.</Text></View>;

  return <View style={{padding:22,gap:18,backgroundColor:'#151f2d',borderRadius:20}}>
    <Text style={{fontSize:25,fontWeight:'800',color:'#fff'}}>{!authUser?`Acceso de ${role==='player'?'jugador':'entrenador'}`:role==='player'?'Área de jugadores':'Área de entrenadores'}</Text>
    {!authUser?<><Text style={text}>Inicia sesión con tu cuenta para continuar como {role==='player'?'jugador':'entrenador'}.</Text><AccessMethods onSuccess={async signedIn=>{su(signedIn);try{sprofile(await getProfile(signedIn))}catch(e){se(e.message||'No se pudo crear tu perfil.');}}}/></>:role==='player'?!user?<Text style={text}>Comprobando tu cuenta…</Text>:<><Text style={text}>{user.name||authUser.displayName||authUser.email} · {user.email||authUser.email}</Text><AddPassword user={authUser}/>{user.status==='approved'&&user.claim?.role==='player'?<><Text style={text}>Acceso aprobado: {user.claim.category} · {user.claim.name}</Text><Text style={text}>Abriendo tu espacio…</Text></>:user.status==='pending'?<><Text style={text}>Tu solicitud para {user.claim?.category} está pendiente de aprobación por el administrador. Se actualizará automáticamente.</Text><Pressable style={button} disabled={busy} onPress={refreshMyRequest}><Text style={text}>{busy?'Comprobando…':'Comprobar estado de la solicitud'}</Text></Pressable></>:user.status==='admin'||user.status==='approved'?<Text style={text}>Esta cuenta ya está vinculada como administrador o entrenador. Cierra sesión y usa una cuenta de jugador para solicitar una ficha.</Text>:<>
        <Text style={text}>{user.status==='revoked'?'Tu acceso ha sido retirado. Puedes solicitar una nueva revisión.':user.status==='rejected'?'La solicitud ha sido rechazada. Comprueba que has elegido tu ficha antes de volver a solicitarlo.':'Elige tu equipo y tu ficha oficial. El administrador confirmará que te corresponde.'}</Text>
        <Text style={{...text,fontWeight:'800'}}>Equipo</Text><Pressable accessibilityRole="button" accessibilityState={{expanded:teamPicker}} style={[button,{backgroundColor:'#0b121d'}]} onPress={()=>stp(value=>!value)}><Text style={text}>{teams.find(item=>item.id===team)?.category} · {teams.find(item=>item.id===team)?.name.match(/'([^']+)'/)?.[1]||teams.find(item=>item.id===team)?.name} {teamPicker?'⌃':'⌄'}</Text></Pressable>{teamPicker&&<ScrollView nestedScrollEnabled style={{maxHeight:260}} keyboardShouldPersistTaps="handled">{teams.map(t=><Pressable key={t.id} style={[button,team===t.id&&{backgroundColor:'#b42122'}]} onPress={()=>{sc(t.id);ssp(null);stp(false)}}><Text style={text}>{t.category} · {t.name}</Text></Pressable>)}</ScrollView>}
        <Text style={{...text,fontWeight:'800'}}>Tu ficha en la plantilla</Text>{!playerRoster.length?<Text style={text}>Consultando jugadores publicados para este equipo…</Text>:playerRoster.map(player=><Pressable key={player.id} accessibilityRole="radio" accessibilityState={{selected:String(selectedPlayer?.id)===String(player.id)}} style={[button,String(selectedPlayer?.id)===String(player.id)&&{backgroundColor:'#b42122'}]} onPress={()=>ssp(player)}><Text style={text}>{player.name} · Dorsal {player.number??'—'} · {player.position||'Posición no publicada'}</Text></Pressable>)}
        {!!playerRoster.length&&<Pressable style={[button,{opacity:busy||!selectedPlayer ? .55 : 1}]} disabled={busy||!selectedPlayer} onPress={submitPlayerClaim}><Text style={text}>{busy?'Enviando solicitud…':'Solicitar acceso a mi ficha'}</Text></Pressable>}
      </>}</>:!user?<Text style={text}>Comprobando tu cuenta…</Text>:<>
      <Text style={text}>{user.name||authUser.displayName||authUser.email} · {user.email||authUser.email}</Text>
      <AddPassword user={authUser}/>
      {user.status==='admin'?<>
        <Text style={{...text,color:'#91adff',fontWeight:'800'}}>ADMINISTRADOR DEL CLUB</Text>
        <Text style={text}>Aprueba las solicitudes después de comprobar la identidad y el equipo de cada entrenador.</Text>
        <Pressable style={button} disabled={busy} onPress={refreshRequests}><Text style={text}>{busy?'Actualizando…':'Actualizar solicitudes'}</Text></Pressable>
        {!requests.some(r=>r.status==='pending')&&<Text style={text}>Todavía no hay solicitudes. Para aparecer aquí, cada entrenador debe entrar en esta app, elegir su equipo y su nombre, y pulsar «Solicitar acceso a este equipo». Si usa correo y contraseña, primero tiene que verificar el correo.</Text>}
        {requests.filter(r=>r.status==='pending').map(r=><View key={r.id} style={{gap:10,padding:14,backgroundColor:'#0b121d',borderRadius:12}}>
          <Text style={text}>{r.name} · {r.email}</Text><Text style={text}>{r.claim?.role==='player'?'Jugador':'Entrenador'} · {r.claim?.name||'Sin identidad seleccionada'} · {r.claim?.category||'Sin equipo'}</Text><Text style={text}>Estado: {labels[r.status]||r.status}</Text>
          {r.status==='pending'&&<><Pressable style={button} onPress={()=>action(r.id,'approve')}><Text style={text}>Aprobar acceso</Text></Pressable><Pressable style={button} onPress={()=>action(r.id,'reject')}><Text style={text}>Rechazar solicitud</Text></Pressable></>}
          {r.status==='approved'&&<Pressable style={button} onPress={()=>action(r.id,'revoke')}><Text style={text}>Retirar acceso</Text></Pressable>}
        </View>)}
        <Pressable style={button} onPress={()=>onSuccess(user)}><Text style={text}>Entrar a la gestión del equipo</Text></Pressable>
      </>:user.status==='approved'?<><Text style={text}>Acceso aprobado: {user.claim?.category} · {user.claim?.name}</Text><Text style={text}>Abriendo tu equipo…</Text></>:user.status==='pending'?<><Text style={text}>Tu solicitud para {user.claim?.category} está pendiente de aprobación por el administrador. Se actualizará automáticamente.</Text><Pressable style={button} disabled={busy} onPress={refreshMyRequest}><Text style={text}>{busy?'Comprobando…':'Comprobar estado de la solicitud'}</Text></Pressable></>:<>
        <Text style={text}>{user.status==='revoked'?'Tu acceso ha sido retirado. Puedes solicitar una nueva revisión.':user.status==='rejected'?'La solicitud ha sido rechazada. Comprueba tu identidad y equipo antes de volver a solicitarlo.':'Selecciona tu equipo y tu identidad.'}</Text>
        <Text style={text}>Si entrenas a varios equipos, añade todos antes de enviar la solicitud. Solo tendrás que hacerlo en tu primer acceso.</Text><TeamSelector value={team} onChange={sc}/>{assignments.map(t=><Pressable key={t.teamId} accessibilityRole="button" onPress={()=>setAssignments(list=>list.filter(a=>a.teamId!==t.teamId))}><Text style={text}>✓ {t.category} · {t.teamName} · {t.name} · Quitar</Text></Pressable>)}
        <Text style={text}>¿Quién eres dentro del cuerpo técnico?</Text>{roster.map((r,i)=><Pressable key={i} style={[button,name===r.name&&{backgroundColor:'#b42122'}]} onPress={()=>sn(r.name)}><Text style={text}>{r.name} · {r.role||'Cuerpo técnico'}</Text></Pressable>)}
        <Text style={text}>Si no apareces todavía, indica tu nombre para que el administrador lo revise.</Text><TextInput placeholder="Tu nombre en el cuerpo técnico" placeholderTextColor="#91a5be" style={{...text,padding:14,backgroundColor:'#0b121d',borderRadius:10}} value={name} onChangeText={sn}/>
        <Pressable style={button} disabled={!name.trim()} onPress={()=>{const t=teams.find(t=>t.id===team);setAssignments(list=>[...list.filter(a=>a.teamId!==team),{teamId:team,name:name.trim(),category:t.category,teamName:t.name}]);sn('')}}><Text style={text}>Añadir este equipo y seleccionar otro</Text></Pressable><Pressable style={[button,{opacity:busy||(!name.trim()&&!assignments.length) ? .55 : 1}]} disabled={busy||(!name.trim()&&!assignments.length)} onPress={submitClaim}><Text style={text}>{busy?'Enviando solicitud…':'Solicitar acceso a mis equipos'}</Text></Pressable>
      </>}
      <Pressable onPress={logout}><Text style={{color:'#ffc1c9'}}>Cerrar sesión</Text></Pressable>
    </>}
    {!!notice&&<Text style={{color:'#9fe3bd',lineHeight:22}}>{notice}</Text>}
    {!!error&&<Text style={{color:'#ffc1c9',lineHeight:22}}>{error}</Text>}
  </View>;
}
