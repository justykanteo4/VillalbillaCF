const assert=require('node:assert/strict');const base='http://127.0.0.1:8185/v1/projects/demo-villalbilla/databases/(default)/documents/';
const token=uid=>[Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/demo-villalbilla',aud:'demo-villalbilla',sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'password'}})).toString('base64url'),''].join('.');
const encode=v=>typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:typeof v==='object'?{mapValue:{fields:fields(v)}}:null;const fields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,encode(v)]));
async function req(path,uid,body,method=body?'PATCH':'GET'){const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+(uid==='owner'?'owner':token(uid)),'Content-Type':'application/json'},body:body?JSON.stringify({fields:fields(body)}):undefined});if(!r.ok&&r.status!==403)console.log(r.status,await r.clone().text());return r}
async function message(path,uid,body='Hola',sender=uid){const r=await fetch(base.slice(0,-1)+':commit',{method:'POST',headers:{Authorization:'Bearer '+token(uid),'Content-Type':'application/json'},body:JSON.stringify({writes:[{update:{name:'projects/demo-villalbilla/databases/(default)/documents/'+path,fields:fields({body,senderId:sender,senderName:sender})},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:false}}]})});if(!r.ok&&r.status!==403)console.log(r.status,await r.clone().text());return r.status}
(async()=>{
const loaded=await fetch('http://127.0.0.1:8185/emulator/v1/projects/demo-villalbilla:securityRules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content:require('node:fs').readFileSync('firestore.rules','utf8')}]}})});assert.equal(loaded.status,200);

await fetch('http://127.0.0.1:8185/emulator/v1/projects/demo-villalbilla/databases/(default)/documents',{method:'DELETE'});
for(const [id,status,role,team] of [['coach','approved','trainer','a'],['player','approved','player','a'],['other','approved','player','b'],['pending','pending','player','a'],['fan','approved','fan','a'],['third','approved','player','a']])assert.equal((await req('trainerProfiles/'+id,'owner',{status,claim:{role,teamId:team,teamIds:[team],name:id}})).status,200);
assert.equal((await req('teamChats/a/members/coach','coach',{uid:'coach',name:'coach',role:'trainer'})).status,200);
for(const who of ['other','pending','fan'])assert.equal((await req('teamChats/a/members',''+who)).status,403);
assert.equal((await req('teamChats/a/members/player','coach',{uid:'player',name:'fake',role:'player'})).status,403);

assert.equal((await req('teamChats/a/members/player','player',{uid:'player',name:'player',role:'player'})).status,200);
assert.equal((await req('teamChats/a/members/player','coach')).status,200);
assert.equal((await req('teamChats/a/members/player','other')).status,403);
assert.equal(await message('teamChats/a/messages/disabled','coach'),403);
assert.equal((await req('teamChats/a/messages/old','owner',{body:'Anterior',senderId:'coach',senderName:'coach',createdAt:'old'})).status,200);
assert.equal((await req('teamChats/a/messages/old','player')).status,200);
assert.equal((await req('teamChats/a/direct/new','coach',{memberIds:['coach','player']})).status,403);
assert.equal((await req('teamChats/a/direct/legacy','owner',{memberIds:['coach','player']})).status,200);
assert.equal((await req('teamChats/a/direct/legacy/messages/old','owner',{body:'Privado anterior',senderId:'coach',senderName:'coach',createdAt:'old'})).status,200);
assert.equal((await req('teamChats/a/direct/legacy/messages/old','player')).status,200);
assert.equal((await req('teamChats/a/direct/legacy/messages/old','third')).status,403);
assert.equal(await message('teamChats/a/direct/legacy/messages/disabled','player'),403);
assert.equal((await req('trainerProfiles/player','owner',{status:'pending',claim:{role:'player',teamId:'a',teamIds:['a'],name:'player'}})).status,200);
assert.equal((await req('teamChats/a/members/player','coach')).status,403);
assert.equal((await req('teamChats/a/direct/legacy/messages/old','coach')).status,403);
console.log('Reglas verificadas: permisos de compañeros, revocación y migración de mensajes anteriores solo en lectura.');
})().catch(e=>{console.error(e);process.exit(1)});
