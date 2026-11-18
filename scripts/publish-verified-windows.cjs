// Verified production publish for Windows PowerShell.
// Run: node scripts/publish-verified-windows.cjs --publish
// No D1 migrations, resets or destructive operations are performed.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
process.chdir(root);
const pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
const command=(args,{env={},capture=false}={})=>{
 const result=spawnSync(pnpm,args,{
  cwd:root,env:{...process.env,...env},encoding:'utf8',
  stdio:capture?['inherit','pipe','inherit']:'inherit',
  shell:process.platform==='win32'
 });
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Se ha detenido la publicación: '+pnpm+' '+args.join(' ')+' (salida '+result.status+')');
 return capture?result.stdout:'';
};
const validateBundle=()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'bundled-data-manifest.json'),'utf8'));
 if(manifest.pending!==0||manifest.teams!==17||!manifest.entries||!manifest.reports)
  throw Error('Publicación detenida: faltan datos oficiales del club (pending debe ser 0).');
 console.log('Paquete deportivo:',manifest.teams,'equipos,',manifest.entries,'entradas,',manifest.reports,'actas, 0 pendientes');
};
const validateRuntime=(runtime,env)=>{
 const config=JSON.parse(command(['exec','expo','config','--json'],{env,capture:true}));
 if(config.runtimeVersion!==runtime||config.updates?.requestHeaders?.['expo-channel-name']!=='production')
  throw Error('Runtime o canal OTA incorrecto para '+runtime+'. No se ha publicado la actualización.');
};
function main(){
 if(!process.argv.includes('--publish')){
  console.log('No se publica nada sin --publish. Ejemplo: node scripts/publish-verified-windows.cjs --publish');
  return;
 }
 if(process.platform!=='win32')throw Error('Este lanzador está preparado para Windows. Usa el flujo CI en otros sistemas.');
 if(!fs.existsSync(path.join(root,'.env.local')))throw Error('Falta .env.local: comprueba la configuración Expo antes de publicar.');
 console.log('1/7 · Dependencias y pruebas');
 command(['install','--frozen-lockfile']);
 command(['test']);
 console.log('2/7 · Preparación y validación del paquete');
 command(['run','prepare:release-data']);
 command(['run','check:release']);
 validateBundle();
 command(['run','check:web-android-ios']);
 command(['exec','node','--env-file-if-exists=.env.local','scripts/check-update-config.cjs']);
 console.log('3/7 · Copia de seguridad D1 antes de desplegar');
 const backups=path.join(root,'copias-seguridad');fs.mkdirSync(backups,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const dump=path.join(backups,'fantasy-'+stamp+'.sql');
 command(['exec','wrangler','d1','export','villalbilla-chats','--remote','--output',dump]);
 if(!fs.existsSync(dump)||fs.statSync(dump).size<10000)throw Error('Copia D1 incompleta: publicación cancelada.');
 console.log('Copia verificada:',dump);
 console.log('4/7 · Cloudflare Worker y web');
 command(['run','deploy:cloudflare']);
 for(const [i,runtime] of ['0.1.12','0.1.13'].entries()){
  const env={VILLALBILLA_UPDATE_RUNTIME:runtime};
  const output='work/ota-'+runtime.replaceAll('.','');
  console.log((i+5)+'/7 · Expo Android '+runtime);
  validateRuntime(runtime,env);
  command(['exec','expo','export','--platform','android','--output-dir',output],{env});
  command(['dlx','eas-cli@25.3.0','update','--channel','production','--platform','android',
   '--environment','production','--input-dir',output,'--skip-bundler','--non-interactive',
   '--message','Villalbilla C.F. / Fantasy '+runtime],{env});
 }
 console.log('Actualizaciones web y Android publicadas. Comprueba su aplicación en dispositivos reales.');
}
try{main()}catch(error){console.error(error.message);process.exitCode=1}
