import {Asset} from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

async function modulePngBase64(moduleId){
 const asset=Asset.fromModule(moduleId);
 await asset.downloadAsync();
 if(!asset.localUri)throw Error('No se pudo cargar un PNG de la carta');
 return FileSystem.readAsStringAsync(asset.localUri,{encoding:FileSystem.EncodingType.Base64});
}
export async function cardAssets(photo){
 const [template,crest]=await Promise.all([
  modulePngBase64(require('./assets/player-card-template.png')),
  modulePngBase64(require('./assets/escudo-transparente.png'))
 ]);
 let person='';
 if(photo){
  const file=await FileSystem.getInfoAsync(photo);
  if(file.exists)person=await FileSystem.readAsStringAsync(photo,{encoding:FileSystem.EncodingType.Base64});
 }
 return {template,crest,photo:person,photoMime:/\.png(?:$|\?)/i.test(photo||'')?'png':'jpeg'};
}
