import React,{useEffect,useState} from 'react';
import {Image} from 'react-native';
import {Directory,File,Paths} from 'expo-file-system';
import {digestStringAsync,CryptoDigestAlgorithm} from 'expo-crypto';

const directory=new Directory(Paths.document,'club-images');
const pending=new Map(),writing=new Set(),waiting=[];
let downloads=0;
async function withDownloadSlot(work){
 if(downloads>=3)await new Promise(resolve=>waiting.push(resolve));else downloads++;
 try{return await work()}finally{if(waiting.length)waiting.shift()();else downloads--}
}

async function localImage(uri){
 if(!/^https:\/\//.test(uri||''))return uri;
 if(!pending.has(uri)){
  const job=(async()=>{
   directory.create({idempotent:true,intermediates:true});
   const key=await digestStringAsync(CryptoDigestAlgorithm.SHA256,uri);
   const file=new File(directory,key+'.jpg');
   if(file.exists&&file.size>0)return file.uri;
   const previous=new File(Paths.cache,'club-images',key+'.jpg');
   if(previous.exists&&previous.size>0){try{previous.copy(file);return file.uri}catch{/* Download if the old temporary cache cannot be copied. */}}
   return withDownloadSlot(async()=>{
    writing.add(file.uri);
    try{
     await File.downloadFileAsync(uri,file,{idempotent:true});

     return file.uri;
    }catch(error){if(file.exists)file.delete();throw error}
    finally{writing.delete(file.uri)}
   });
  })();
  pending.set(uri,job);job.finally(()=>pending.delete(uri)).catch(()=>{});
 }
 return pending.get(uri);
}
export default function CachedImage({uri,...props}){
 const [source,setSource]=useState();
 useEffect(()=>{let active=true;setSource(undefined);localImage(uri).then(value=>{if(active)setSource({uri:value})}).catch(()=>{if(active)setSource({uri})});return()=>{active=false}},[uri]);
 return <Image {...props} source={source} onError={event=>{if(source?.uri!==uri)setSource({uri});props.onError?.(event)}}/>;
}

export const cacheImage=localImage;
