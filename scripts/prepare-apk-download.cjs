// Package the verified release as static chunks below Cloudflare's per-file limit.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),name='VillalbillaCF-0.1.12.apk',sha='ec6405765d019de154bdea3ceb451e9d1cf3e09b594541ea451b5b2b76e88718';
let apk;const local=path.resolve(root,'../downloads',name);
if(fs.existsSync(local))apk=fs.readFileSync(local);else{const fetched=spawnSync('git',['fetch','origin','codex/apk-0.1.12-cache-avisos','--depth=1'],{cwd:root,stdio:['ignore','ignore','inherit']});if(fetched.status!==0)throw Error('No se pudo recuperar el APK publicado');const result=spawnSync('git',['show','FETCH_HEAD:'+name],{cwd:root,maxBuffer:80*1024*1024});if(result.status!==0)throw Error('No se pudo leer el APK publicado');apk=result.stdout;}
if(crypto.createHash('sha256').update(apk).digest('hex')!==sha)throw Error('El APK no coincide con la versión verificada');
const folder=path.join(root,'dist','apk-parts');fs.mkdirSync(folder,{recursive:true});const size=20*1024*1024;for(let i=0,start=0;start<apk.length;i++,start+=size)fs.writeFileSync(path.join(folder,'0.1.12-'+i+'.bin'),apk.subarray(start,start+size));console.log('APK 0.1.12 verificado y preparado para descarga directa.');
