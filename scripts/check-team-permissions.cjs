const assert=require('node:assert/strict');
const base='http://127.0.0.1:8185/v1/projects/demo-villalbilla/databases/(default)/documents/';
const field=v=>v===null?{nullValue:null}:Array.isArray(v)?{arrayValue:{values:v.map(field)}}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,field(v)]))}}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{stringValue:v};
const jwt=uid=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-villalbilla',iss:'https://securetoken.google.com/demo-villalbilla',email:uid+'@example.com',email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'password'}})+'.'};
async function req(path,token,body){const r=await fetch(base+path,{method:body?'PATCH':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify({fields:field(body).mapValue.fields})}:{})});return {status:r.status,body:await r.json()}}
(async()=>{
const claim={teamId:'a',teamIds:['a','b'],name:'Entrenador',category:'Infantil',teamName:'Club',role:'trainer'};
for(const [uid,status,c]of [['coach','approved',claim],['other','approved',claim],['pending','pending',claim],['revoked','revoked',claim],['player','approved',{...claim,role:'player'}],['legacy','approved',{teamId:'a',name:'Antiguo',category:'Club',teamName:'Club'}]])assert.equal((await req('trainerProfiles/'+uid,'owner',{uid,email:uid+'@example.com',status,claim:c})).status,200);
for(const team of ['a','b'])assert.equal((await req('teamWorkspaces/'+team,jwt('coach'),{data:{attendance:{'2026-10-26':{player:'Sí'}},materials:[]}})).status,200);
assert.equal((await req('teamWorkspaces/a',jwt('other'))).status,200);
for(const uid of ['pending','revoked','player'])assert.equal((await req('teamWorkspaces/a',jwt(uid),{data:{}})).status,403,uid);
assert.equal((await req('teamWorkspaces/c',jwt('coach'),{data:{}})).status,403);
assert.equal((await req('teamWorkspaces/a',jwt('legacy'))).status,200);assert.equal((await req('teamWorkspaces/b',jwt('legacy'))).status,403);
assert.equal((await req('trainerProfiles/coach',jwt('coach'),{uid:'coach',email:'coach@example.com',status:'approved',claim:{...claim,teamIds:['a','b','c']}})).status,403);
console.log('Firestore emulator: multi-equipo, datos compartidos, aislamiento, jugador, pendiente, revocado y perfil antiguo correctos.');
})().catch(e=>{console.error(e);process.exit(1)});
