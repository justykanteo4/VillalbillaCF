const filename='VillalbillaCF-0.1.12.apk';
const total=54183053;
export async function handleApkDownload(request,assets){
 const url=new URL(request.url);if(url.pathname!=='/downloads/'+filename)return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Método no permitido',{status:405,headers:{Allow:'GET, HEAD'}});
 const headers={'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="'+filename+'"','Content-Length':String(total),'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','ETag':'"ec6405765d019de154bdea3ceb451e9d1cf3e09b594541ea451b5b2b76e88718"'};
 if(request.method==='HEAD')return new Response(null,{headers});
 const chunks=[];for(let i=0;i<3;i++){const u=new URL('/apk-parts/0.1.12-'+i+'.bin',url);const response=await assets.fetch(new Request(u));if(!response.ok||!response.body||response.headers.get('Content-Type')?.includes('text/html')){for(const chunk of chunks)await chunk.cancel();return new Response('Descarga temporalmente no disponible',{status:503});}chunks.push(response.body);}
 let index=0,reader=chunks[0].getReader();
 const body=new ReadableStream({async pull(controller){try{for(;;){const part=await reader.read();if(!part.done){controller.enqueue(part.value);return}reader.releaseLock();index++;if(index===chunks.length){controller.close();return}reader=chunks[index].getReader();}}catch(error){controller.error(error)}},async cancel(reason){await reader.cancel(reason);for(let i=index+1;i<chunks.length;i++)await chunks[i].cancel(reason)}});
 return new Response(body,{headers});
}
