import {Asset} from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
export async function readBundledData(){const asset=Asset.fromModule(require('./assets/offline/club.clubdata'));let timer;try{await Promise.race([asset.downloadAsync(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Copia incluida no disponible')),20000)})]);return JSON.parse(await FileSystem.readAsStringAsync(asset.localUri||asset.uri))}finally{clearTimeout(timer)}}
