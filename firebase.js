import {mergeChanges} from './workspace-sync.cjs';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, getIdToken, initializeAuth, getReactNativePersistence,
  onAuthStateChanged, signOut,
} from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, getDocs, onSnapshot,
  serverTimestamp, setDoc, updateDoc, runTransaction,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);
const ADMIN_EMAILS = Object.freeze([
  'albaresfernandez@gmail.com',
  'appvillalbilla@gmail.com',
]);
const ADMIN_EMAIL = ADMIN_EMAILS[0];
const isAdminEmail = email => ADMIN_EMAILS.includes((email || '').trim().toLowerCase());
let auth = null, db = null;

if (firebaseConfigured) {
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  if (Platform.OS === 'web') auth = getAuth(app);
  else {
    try { auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
    catch { auth = getAuth(app); }
  }
  db = getFirestore(app);
}

export { auth, db, onAuthStateChanged, signOut, isAdminEmail };
export const adminEmail = ADMIN_EMAIL;
export const adminEmails = ADMIN_EMAILS;

export async function getProfile(user) {
 try{const profile=await getProfileOnline(user);await AsyncStorage.setItem('villalbilla.profile.'+user.uid,JSON.stringify(profile)).catch(()=>{});return profile}
 catch(error){if(user&&['unavailable','deadline-exceeded','network-request-failed'].includes(error.code)){const cached=await AsyncStorage.getItem('villalbilla.profile.'+user.uid);if(cached)return JSON.parse(cached)}throw error}
}
async function getProfileOnline(user) {
  if (!db || !user) throw Error('Firebase todavía no está conectado.');
  const email = (user.email || '').trim().toLowerCase();
  const verifiedIdentity = user.emailVerified || user.providerData?.some(provider => provider.providerId === 'google.com');
  const dynamicAdmin = email && verifiedIdentity
    ? (await getDoc(doc(db, 'clubAdmins', email))).exists()
    : false;
  const ref = doc(db, 'trainerProfiles', user.uid), snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      email: (user.email || '').toLowerCase(),
      name: user.displayName || user.email || 'Entrenador',
      status: 'unassigned',
      claim: null,
      updatedAt: Date.now(),
    };
    await setDoc(ref, profile);
    return { ...profile, id: user.uid, status: isAdminEmail(profile.email) || dynamicAdmin ? 'admin' : profile.status };
  }
  const profile = { id: snap.id, ...snap.data() };
  if (isAdminEmail(user.email) || dynamicAdmin) profile.status = 'admin';
  return profile;
}

export function watchProfile(user, callback, onError) {
  if (!db || !user) return () => {};
  return onSnapshot(doc(db, 'trainerProfiles', user.uid), async snapshot => {
    if (!snapshot.exists()) {
      try { callback(await getProfile(user)); } catch (error) { onError?.(error); }
      return;
    }
    const profile = { id: snapshot.id, ...snapshot.data() };
    if (isAdminEmail(user.email)) profile.status = 'admin';
    else if(user.email&&(user.emailVerified||user.providerData?.some(provider=>provider.providerId==='google.com'))){
     try{if((await getDoc(doc(db,'clubAdmins',user.email.toLowerCase()))).exists())profile.status='admin'}catch{}
    }
    AsyncStorage.setItem('villalbilla.profile.'+user.uid,JSON.stringify(profile)).catch(()=>{});
    callback(profile);
  }, onError);
}

export function watchProfiles(callback, onError) {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'trainerProfiles'), async snapshot => {
    let currentAdmins = ADMIN_EMAILS;
    try { currentAdmins = [...new Set([...ADMIN_EMAILS, ...(await listClubAdmins()).map(admin => admin.email)])]; } catch {}
    const profiles = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .filter(profile => !currentAdmins.includes((profile.email || '').trim().toLowerCase()));
    profiles.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    callback(profiles);
  }, onError);
}

export async function getProfiles() {
  if (!db) throw Error('Firebase todavía no está conectado.');
  const [snapshot, admins] = await Promise.all([
    getDocs(collection(db, 'trainerProfiles')),
    listClubAdmins(),
  ]);
  const adminEmailsSet = new Set(admins.map(admin => admin.email));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(profile => !adminEmailsSet.has((profile.email || '').trim().toLowerCase()))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

export async function listClubAdmins() {
  if (!db) throw Error('Firebase todavía no está conectado.');
  const snapshot = await getDocs(collection(db, 'clubAdmins'));
  const admins = new Map(ADMIN_EMAILS.map(email => [email, { email, primary: true }]));
  snapshot.docs.forEach(item => {
    const email = (item.data().email || item.id).trim().toLowerCase();
    if (email) admins.set(email, { email, primary: false });
  });
  return [...admins.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export async function addClubAdmin(value) {
  if (!db || !auth?.currentUser) throw Error('Inicia sesión como administrador para continuar.');
  const email = (value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Escribe un correo electrónico válido.');
  if (isAdminEmail(email)) throw Error('Ese correo ya es administrador.');
  const ref = doc(db, 'clubAdmins', email);
  const current = await getDoc(ref);
  if (current.exists()) throw Error('Ese correo ya es administrador.');
  await setDoc(ref, {
    email,
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return email;
}

export async function claimTeam(user, team, name, assignments=[]) {
  if (!db || !user || !team || !name?.trim()) throw Error('Indica tu equipo y tu nombre.');
  const ref = doc(db, 'trainerProfiles', user.uid), current = await getDoc(ref);
  const selected=assignments.length?assignments:[{teamId:team.id,name:name.trim(),category:team.category,teamName:team.name}];
  const claim = { teamId: team.id, name: name.trim(), category: selected.map(t=>t.category).join(' · '), teamName: team.name, role:'trainer',teamIds:[...new Set(selected.map(t=>String(t.teamId)))],assignments:selected };
  const status = 'pending', updatedAt = Date.now();
  try {
    if (current.exists()) {
      await updateDoc(ref, { claim, status, updatedAt });
    } else {
      await setDoc(ref, {
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        name: user.displayName || user.email || 'Entrenador',
        claim,
        status,
        updatedAt,
      });
    }
    const saved = await getDoc(ref);
    if (!saved.exists() || saved.data().status !== 'pending' || saved.data().claim?.teamId !== team.id) {
      throw Error('Firebase no confirmó la solicitud. Comprueba la conexión y vuelve a enviarla.');
    }
    return { id: user.uid, ...saved.data() };
  } catch (error) {
    if (error.code === 'permission-denied') {
      throw Error('Firebase ha rechazado la solicitud. Comprueba que has iniciado sesión con una cuenta verificada y vuelve a intentarlo.');
    }
    if (error.code === 'not-found') {
      throw Error('No se encontró tu perfil de entrenador. Cierra sesión, vuelve a entrar y solicita acceso de nuevo.');
    }
    throw error;
  }
}

export async function claimPlayer(user, team, player) {
  if (!db || !user || !team || !player?.id || !player?.name) throw Error('Selecciona tu equipo y tu ficha de jugador.');
  const ref = doc(db, 'trainerProfiles', user.uid), current = await getDoc(ref);
  const claim = {
    teamId: team.id,
    playerId: String(player.id),
    name: player.name,
    category: team.category,
    teamName: team.name,
    role: 'player',
  };
  const status = 'pending', updatedAt = Date.now();
  try {
    if (current.exists()) await updateDoc(ref, { claim, status, updatedAt });
    else await setDoc(ref, {
      uid: user.uid,
      email: (user.email || '').toLowerCase(),
      name: user.displayName || user.email || 'Jugador',
      claim,
      status,
      updatedAt,
    });
    const saved = await getDoc(ref);
    if (!saved.exists() || saved.data().status !== 'pending' || saved.data().claim?.playerId !== String(player.id)) {
      throw Error('Firebase no confirmó la solicitud. Comprueba la conexión y vuelve a intentarlo.');
    }
    return { id: user.uid, ...saved.data() };
  } catch (error) {
    if (error.code === 'permission-denied') throw Error('Firebase ha rechazado la solicitud. Comprueba que has iniciado sesión con una cuenta verificada y vuelve a intentarlo.');
    if (error.code === 'not-found') throw Error('No se encontró tu perfil. Cierra sesión, vuelve a entrar y solicita acceso de nuevo.');
    throw error;
  }
}

export async function decideRequest(id, action) {
  if (!db || !['approve', 'reject', 'revoke'].includes(action)) throw Error('Solicitud inválida.');
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revoked';
  await updateDoc(doc(db, 'trainerProfiles', id), { status, updatedAt: Date.now() });
}

export async function getTeamWorkspace(teamId) {
  if (!db || !teamId) return null;
  if (auth?.currentUser) await getIdToken(auth.currentUser, true);
  const snap = await getDoc(doc(db, 'teamWorkspaces', teamId));
  return snap.exists() ? snap.data().data : null;
}

export function watchTeamWorkspace(teamId,callback,onError) {
 if(!db)return ()=>{};
 return onSnapshot(doc(db,'teamWorkspaces',teamId),snapshot=>callback(snapshot.exists()?snapshot.data().data:null),onError);
}

export function saveTeamWorkspace(teamId, data, base={}) {
  if (!db || !teamId) return Promise.reject(Error('Firebase todavía no está conectado.'));
  const ref=doc(db,'teamWorkspaces',teamId);
  return runTransaction(db,async transaction=>{
   const snap=await transaction.get(ref);
   const merged=mergeChanges(base,data,snap.exists()?snap.data().data:base);
   transaction.set(ref,{data:merged,updatedAt:serverTimestamp()});
   return merged;
  });
}
