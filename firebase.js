import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, initializeAuth, getReactNativePersistence,
  onAuthStateChanged, signOut,
} from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, getDocs, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);
const ADMIN_EMAIL = 'albaresfernandez@gmail.com';
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

export { auth, db, onAuthStateChanged, signOut };
export const adminEmail = ADMIN_EMAIL;

export async function requestEmailLink(email) {
  if (!auth || !email) throw Error('Escribe tu correo electrónico.');
  const { sendSignInLinkToEmail } = await import('firebase/auth');
  const url = process.env.EXPO_PUBLIC_FIREBASE_CONTINUE_URL || 'https://villalbilla-cf.albaresfernandez.workers.dev/';
  await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), {
    url,
    handleCodeInApp: true,
    iOS: { bundleId: 'com.villalbilla.cf' },
    android: { packageName: 'com.villalbilla.cf', installApp: true, minimumVersion: '3' },
  });
}

export async function getProfile(user) {
  if (!db || !user) throw Error('Firebase todavía no está conectado.');
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
    return { ...profile, id: user.uid, status: profile.email === ADMIN_EMAIL ? 'admin' : profile.status };
  }
  const profile = { id: snap.id, ...snap.data() };
  if ((user.email || '').toLowerCase() === ADMIN_EMAIL) profile.status = 'admin';
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
    if ((user.email || '').toLowerCase() === ADMIN_EMAIL) profile.status = 'admin';
    callback(profile);
  }, onError);
}

export function watchProfiles(callback, onError) {
  if (!db) return () => {};
  const q = query(collection(db, 'trainerProfiles'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))), onError);
}

export async function claimTeam(user, team, name) {
  if (!db || !user || !team || !name.trim()) throw Error('Indica tu equipo y tu nombre.');
  const ref = doc(db, 'trainerProfiles', user.uid), current = await getProfile(user);
  const claim = { teamId: team.id, name: name.trim(), category: team.category, teamName: team.name };
  const next = { ...current, claim, status: 'pending', updatedAt: Date.now() };
  await setDoc(ref, next, { merge: true });
  return next;
}

export async function decideRequest(id, action) {
  if (!db || !['approve', 'reject', 'revoke'].includes(action)) throw Error('Solicitud inválida.');
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revoked';
  await updateDoc(doc(db, 'trainerProfiles', id), { status, updatedAt: Date.now() });
}

export async function getTeamWorkspace(teamId) {
  if (!db || !teamId) return null;
  const snap = await getDoc(doc(db, 'teamWorkspaces', teamId));
  return snap.exists() ? snap.data().data : null;
}

export function saveTeamWorkspace(teamId, data) {
  if (!db || !teamId) return Promise.resolve();
  return setDoc(doc(db, 'teamWorkspaces', teamId), { data, updatedAt: serverTimestamp() });
}
