// Modelo gratuito de segmentación de personas: se descarga en el dispositivo;
// la fotografía NO se envía a un servicio de procesamiento.
const CDN='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/';
function backgroundRemovalHtml(base64){
 if(typeof base64!=='string'||!base64||!/^[A-Za-z0-9+/=]+$/.test(base64))throw Error('Fotografía inválida');
 const src='data:image/jpeg;base64,'+base64;
 return `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="${CDN}selfie_segmentation.js"></script></head><body style="margin:0"><canvas id="output" width="512" height="512"></canvas><script>
 (function(){
  let sent=false;
  const done=value=>{if(sent)return;sent=true;window.ReactNativeWebView.postMessage(JSON.stringify(value))};
  const timer=setTimeout(()=>done({error:'Tiempo de procesamiento agotado'}),30000);
  const picture=new Image();
  picture.onload=async()=>{
   try{
    if(typeof SelfieSegmentation!=='function')throw Error('El modelo de recorte no se pudo cargar');
    const segmenter=new SelfieSegmentation({locateFile:file=>${JSON.stringify(CDN)}+file});
    segmenter.setOptions({modelSelection:1});
    segmenter.onResults=result=>{
     try{
      if(!result.segmentationMask)throw Error('Sin máscara de persona');
      const canvas=document.getElementById('output');
      canvas.width=picture.naturalWidth;canvas.height=picture.naturalHeight;
      const context=canvas.getContext('2d');
      context.clearRect(0,0,canvas.width,canvas.height);
      context.drawImage(result.segmentationMask,0,0,canvas.width,canvas.height);
      context.globalCompositeOperation='source-in';
      context.drawImage(picture,0,0,canvas.width,canvas.height);
      context.globalCompositeOperation='source-over';
      clearTimeout(timer);
      done({png:canvas.toDataURL('image/png').split(',')[1]});
      segmenter.close();
     }catch(error){clearTimeout(timer);done({error:String(error)})}
    };
    await segmenter.send({image:picture});
   }catch(error){clearTimeout(timer);done({error:String(error)})}
  };
  picture.onerror=()=>{clearTimeout(timer);done({error:'Imagen dañada'})};
  picture.src=${JSON.stringify(src)};
 })();
 </script></body></html>`;
}
module.exports={backgroundRemovalHtml};
