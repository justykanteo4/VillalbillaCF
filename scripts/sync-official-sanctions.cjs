// Run in the managed environment. Credentials are used only at the federation;
// production receives an encrypted session secret, never the user's password.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const teams=require('../teams.json'),{parseOfficialSanctions,OFFICIAL_URL}=require('../official-sanctions.cjs'),{groupFixtures}=require('../server/news.cjs');
const root=path.resolve(__dirname,'..'),origin='https://intranet.ffmadrid.es',jar=new Map(),publish=process.argv.includes('--publish');
const groups=[...new Map(teams.map(t=>[t.competition+':'+t.group,t])).values()];
async function request(url,options={}){const target=new URL(url,origin);if(target.origin!==origin)throw Error('Destino federativo no permitido.');const response=await fetch(target,{...options,headers:{'User-Agent':'Mozilla/5.0',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...options.headers},redirect:'manual',signal:AbortSignal.timeout(30000)});for(const cookie of response.headers.getSetCookie()){const first=cookie.split(';')[0],i=first.indexOf('=');if(i>0)jar.set(first.slice(0,i),first.slice(i+1))}return response}
async function html(response){return new TextDecoder('windows-1252').decode(await response.arrayBuffer())}
function wrangler(args,input){const result=spawnSync(path.join(root,'node_modules/.bin/wrangler'),args,{cwd:root,env:{...process.env,XDG_CONFIG_HOME:'/workspace/.cloudflare-config',WRANGLER_SEND_METRICS:'false'},input,encoding:'utf8',maxBuffer:8*1024*1024});if(result.status!==0)throw Error('No se pudo completar la operación de Cloudflare (código '+result.status+').');return result.stdout}
const sqlText=s=>"'"+String(s).replace(/'/g,"''")+"'";
(async()=>{
 if(publish)wrangler(['d1','execute','villalbilla-visits','--remote','--command',fs.readFileSync(path.join(root,'official-sanctions-schema.sql'),'utf8')]);
 if(!process.env.RFFM_USERNAME||!process.env.RFFM_PASSWORD)throw Error('Faltan las credenciales privadas de la federación.');
 await request('/nfg/');const login=await request('/nfg/NLogin',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({NUser:process.env.RFFM_USERNAME,NPass:process.env.RFFM_PASSWORD,LoginAjax:'1',NURL:'/nfg/NPcd/NFG_ConsultaSanciones?cod_primaria=1000191'})});
 if(!/estado\s*=\s*["']?1\b/.test(await html(login)))throw Error('La federación no ha aceptado el acceso.');
 await request('/nfg/');console.log('Acceso federativo validado.');let succeeded=0,failed=0;
 const {queryUrl}=await import('../server/official-source.mjs');
 for(const team of groups){try{const checkedAt=new Date().toISOString(),response=await request(queryUrl(team));if(!response.ok)throw Error();const parsed=parseOfficialSanctions(await html(response),team),clubIds=new Set(teams.filter(t=>t.competition===team.competition&&t.group===team.group).map(t=>t.id));parsed.records=parsed.records.filter(r=>r.duration||clubIds.has(r.teamId));let fixtures=[];try{fixtures=(await groupFixtures(team.id)||[]).map(({id,round,date,time,homeId,awayId,homeScore,awayScore})=>({id,round,date,time,homeId,awayId,homeScore,awayScore}))}catch{}
  if(publish){const query='INSERT INTO official_sanction_groups(group_key,competition,group_id,records_json,checked_at,attempted_at,last_error,fixtures_json) VALUES('+[team.competition+':'+team.group,team.competition,team.group,JSON.stringify(parsed.records),checkedAt,String(Date.parse(checkedAt)),null,JSON.stringify(fixtures)].map(v=>v===null?'NULL':sqlText(v)).join(',')+') ON CONFLICT(group_key) DO UPDATE SET records_json=excluded.records_json,checked_at=excluded.checked_at,attempted_at=excluded.attempted_at,last_error=NULL,fixtures_json=excluded.fixtures_json';wrangler(['d1','execute','villalbilla-visits','--remote','--command',query])}
  console.log(team.category+' · '+team.id+': '+parsed.records.filter(r=>r.duration).length+' resoluciones con duración.');succeeded++;
 }catch(e){console.log(team.category+' · '+team.id+': pendiente ('+(String(e.message).startsWith('OFFICIAL_')?e.message:String(e.message).startsWith('No se pudo completar')?'CLOUDFLARE_WRITE':'SOURCE_UNAVAILABLE')+'); se conserva la copia anterior.');failed++}}
 if(publish){const cookie=[...jar].map(([k,v])=>k+'='+v).join('; ');if(!cookie)throw Error('No se pudo preparar la sesión federativa.');wrangler(['secret','put','RFFM_SESSION','--name','villalbilla-cf'],cookie);console.log('Sesión de consulta guardada como secreto del servidor.')}
 console.log('Grupos actualizados: '+succeeded+'/'+groups.length+'. Pendientes: '+failed+'.');if(!succeeded)process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
