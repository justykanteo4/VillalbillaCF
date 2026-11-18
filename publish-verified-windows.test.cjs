const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),fs=require('node:fs');
test('publicar requiere activación explícita y nunca inicia el despliegue por defecto',()=>{
 const r=spawnSync(process.execPath,['scripts/publish-verified-windows.cjs'],{encoding:'utf8'});
 assert.equal(r.status,0);assert.match(r.stdout,/No se publica nada sin --publish/);
});
test('el despliegue verifica pruebas, pendientes, copia D1 y ambos runtimes antes de OTA',()=>{
 const s=fs.readFileSync('scripts/publish-verified-windows.cjs','utf8');
 for(const p of ['--publish','--frozen-lockfile',"'test'","'prepare:release-data'","'check:web-android-ios'","manifest.pending!==0","'d1','export'","'deploy:cloudflare'","'0.1.12','0.1.13'","validateRuntime(runtime,env)"])assert(s.includes(p),p);
 assert.match(fs.readFileSync('.gitignore','utf8'),/\/copias-seguridad\//);
});
