import * as SecureStore from 'expo-secure-store';
const KEY='villalbilla.auth.session';
export const readSession=()=>SecureStore.getItemAsync(KEY);
export const rememberSession=token=>token?SecureStore.setItemAsync(KEY,token,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}):SecureStore.deleteItemAsync(KEY);
