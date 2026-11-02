// Small match attachments in the existing free D1 database, never in public release data.
export const IMAGE_LIMIT=2*1024*1024,VIDEO_LIMIT=8*1024*1024,CHUNK_SIZE=256*1024;
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function boundedBody(request,limit){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw fail('El archivo supera el tamaño permitido.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const out=new Uint8Array(size);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}return out;
}
export function mediaType(bytes){
 const ascii=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')return 'image/png';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
 if(ascii(4,8)==='ftyp'){const brand=ascii(8,12);if(['avif','avis','heic','heix','mif1'].includes(brand))return null;return brand==='qt  '?'video/quicktime':'video/mp4'}
 if(bytes.slice(0,4).join(',')==='26,69,223,163'&&ascii(0,256).includes('webm'))return 'video/webm';
 return null;
}
export async function readPost(request){
 if(request.headers.get('Content-Type')?.startsWith('multipart/form-data')){
  const bytes=await boundedBody(request,VIDEO_LIMIT+65536),form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData(),file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function')throw fail('Selecciona una foto o un vídeo.');
  const content=new Uint8Array(await file.arrayBuffer()),mime=mediaType(content);if(!mime)throw fail('Usa una foto JPG, PNG o WebP, o un vídeo MP4, MOV o WebM.');
  if(content.length>(mime.startsWith('image/')?IMAGE_LIMIT:VIDEO_LIMIT))throw fail('Máximo 2 MB por foto y 8 MB por vídeo.',413);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',content)),b=>b.toString(16).padStart(2,'0')).join('');return {id:form.get('id'),body:form.get('body')||'',media:{content,mime,digest}};
 }
 const bytes=await boundedBody(request,5000);try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object')throw Error();return {...value,media:undefined}}catch{throw fail('Solicitud no válida.')}
}
export function mediaStatements(db,id,uid,media,now){
 if(!media)return [];const {content,mime,digest}=media,statements=[db.prepare('INSERT INTO social_media(id,uid,mime,size,created_at,digest) VALUES(?,?,?,?,?,?)').bind(id,uid,mime,content.length,now,digest)];
 for(let i=0;i<content.length;i+=CHUNK_SIZE)statements.push(db.prepare('INSERT INTO social_media_chunks VALUES(?,?,?)').bind(id,i/CHUNK_SIZE,content.slice(i,i+CHUNK_SIZE).buffer));return statements;
}
export async function serveMedia(request,db){
 const id=new URL(request.url).searchParams.get('id');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id||''))return new Response(null,{status:404});
 const meta=await db.prepare('SELECT mime,size FROM social_media WHERE id=?').bind(id).first();if(!meta)return new Response(null,{status:404});
 const headers={'Access-Control-Allow-Origin':'*','Content-Type':meta.mime,'Accept-Ranges':'bytes','Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'};
 let start=0,end=meta.size-1;const range=request.headers.get('Range');
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+meta.size}});if(!m[1])start=Math.max(0,meta.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}if(start>end||start>=meta.size||!Number.isSafeInteger(start))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+meta.size}});headers['Content-Range']=`bytes ${start}-${end}/${meta.size}`}
 headers['Content-Length']=String(end-start+1);
 if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});
 const rows=await db.prepare('SELECT part,content FROM social_media_chunks WHERE id=? AND part>=? AND part<=? ORDER BY part').bind(id,Math.floor(start/CHUNK_SIZE),Math.floor(end/CHUNK_SIZE)).all();
 const data=new Uint8Array(end-start+1);for(const row of rows.results){const bytes=new Uint8Array(row.content),base=row.part*CHUNK_SIZE,from=Math.max(start,base),to=Math.min(end+1,base+bytes.length);data.set(bytes.subarray(from-base,to-base),from-start)}
 return new Response(data,{status:range?206:200,headers});
}
