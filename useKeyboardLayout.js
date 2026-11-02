import {useEffect,useState} from 'react';
import {Keyboard,Platform} from 'react-native';
export default function useKeyboardLayout(){
 const [layout,setLayout]=useState({visible:!!Keyboard.isVisible?.(),height:undefined});
 useEffect(()=>{
  if(Platform.OS==='web'&&typeof window!=='undefined'){
   const viewport=window.visualViewport;let baseline=Math.max(window.innerHeight,viewport?.height||0);
   const update=()=>{const height=viewport?.height||window.innerHeight,focused=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;if(!focused)baseline=Math.max(baseline,window.innerHeight,height);const visible=!!focused&&baseline-height>120;setLayout({visible,height:visible?height:undefined})};
   viewport?.addEventListener('resize',update);window.addEventListener('resize',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);update();
   return()=>{viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update)};
  }
  const show=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillShow':'keyboardDidShow',()=>setLayout({visible:true,height:undefined})),hide=Keyboard.addListener(Platform.OS==='ios'?'keyboardWillHide':'keyboardDidHide',()=>setLayout({visible:false,height:undefined}));
  return()=>{show.remove();hide.remove()};
 },[]);
 return layout;
}
