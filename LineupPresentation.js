import React,{forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {Platform,View} from 'react-native';
import {WebView} from 'react-native-webview';
export default forwardRef(function LineupPresentation({html,onMessage},ref){
 const web=useRef(null),native=useRef(null),callback=useRef(onMessage);callback.current=onMessage;
 useImperativeHandle(ref,()=>({command(name){if(!['replay','record'].includes(name))return;if(Platform.OS==='web')web.current?.contentWindow?.postMessage({presentationCommand:name},'*');else native.current?.injectJavaScript(`window.lineupPresentation&&window.lineupPresentation.${name}();true;`)}}),[]);
 useEffect(()=>{if(Platform.OS!=='web')return;const receive=e=>{if(e.source===web.current?.contentWindow&&e.data?.lineupPresentation)callback.current(e.data)};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[]);
 return <View style={{flex:1,minHeight:180,width:'100%'}}>{Platform.OS==='web'?React.createElement('iframe',{ref:web,title:'Presentación de la alineación',srcDoc:html,style:{width:'100%',height:'100%',border:0},sandbox:'allow-scripts allow-same-origin'}):<WebView ref={native} source={{html}} originWhitelist={['*']} javaScriptEnabled scrollEnabled={false} onMessage={e=>{try{callback.current(JSON.parse(e.nativeEvent.data))}catch{}}} style={{flex:1,backgroundColor:'#071018'}}/>}</View>;
});
