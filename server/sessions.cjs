const fs=require('fs'),path=require('path'),crypto=require('crypto');
const file=process.env.VILLALBILLA_SESSIONS_FILE||path.join(__dirname,'data','sessions.json'),TTL=30*86400000;
let records={};try{records=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const hash=token=>crypto.createHash('sha256').update(String(token)).digest('hex');
function save(){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(records));fs.renameSync(file+'.tmp',file)}
function issue(id){for(const [key,value]of Object.entries(records))if(value.expiry<Date.now())delete records[key];const token=crypto.randomBytes(32).toString('hex');records[hash(token)]={id,expiry:Date.now()+TTL};save();return token}
function lookup(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;const r=records[hash(token)];return r&&r.expiry>Date.now()?r:null}
function revokeUser(id){for(const [key,r]of Object.entries(records))if(r.id===id)delete records[key];save()}
function remove(token){if(token){delete records[hash(token)];save()}}
const secure=()=>process.env.NODE_ENV==='production'||process.env.SESSION_COOKIE_SECURE==='true';
function setCookie(res,token){res.setHeader('Set-Cookie','villalbilla_session='+token+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+TTL/1000+(secure()?'; Secure':''))}
function clearCookie(res){res.setHeader('Set-Cookie','villalbilla_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(secure()?'; Secure':''))}
function cookieToken(req){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('villalbilla_session='))?.slice('villalbilla_session='.length)||''}
module.exports={issue,lookup,remove,revokeUser,setCookie,clearCookie,cookieToken};
