import React,{useEffect,useRef,useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import CachedImage from './CachedImage';
import {watchViewport} from './viewport-media';
export default function ViewportImage({uri,style,...props}){const ref=useRef(null),[shown,setShown]=useState(false),{height}=useWindowDimensions();useEffect(()=>{setShown(false)},[uri]);useEffect(()=>{if(shown)return;let active=true;const check=()=>ref.current?.measureInWindow((x,y,w,h)=>{if(active&&h>0&&y<height+240&&y+h>-240)setShown(true)});const frame=requestAnimationFrame(check),stop=watchViewport(check);return()=>{active=false;cancelAnimationFrame(frame);stop()}},[shown,height,uri]);return <View ref={ref} collapsable={false} onLayout={()=>{ref.current?.measureInWindow((x,y,w,h)=>{if(h>0&&y<height+240&&y+h>-240)setShown(true)})}} style={style}>{shown&&<CachedImage {...props} uri={uri} style={{width:'100%',height:'100%'}}/>}</View>}
