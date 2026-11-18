import AsyncStorage from '@react-native-async-storage/async-storage';
import {Appearance} from 'react-native';
import palettePolicy from './fantasy-theme-modes.cjs';
const KEY='villalbilla:fantasy:appearance:v1';
let chosen='auto',loaded=false;
const subscribers=new Set();
const notify=()=>{for(const listener of [...subscribers])listener()};
export const getFantasyThemeMode=()=>chosen;
export const subscribeFantasyTheme=callback=>{subscribers.add(callback);return()=>subscribers.delete(callback)};
export async function initializeFantasyTheme(){
 if(loaded)return chosen;
 loaded=true;
 try{const stored=await AsyncStorage.getItem(KEY);chosen=palettePolicy.normalizeMode(stored)}
 catch{chosen='auto'}
 notify();return chosen;
}
export async function changeFantasyTheme(mode){
 const next=palettePolicy.normalizeMode(mode);
 await AsyncStorage.setItem(KEY,next);
 chosen=next;notify();
 return chosen;
}
export function currentFantasyPalette(systemScheme=Appearance.getColorScheme()){
 return palettePolicy.palette(chosen,systemScheme);
}
