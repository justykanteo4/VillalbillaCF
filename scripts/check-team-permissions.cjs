const assert=require('node:assert/strict');
const base='http://127.0.0.1:8185/v1/projects/demo-villalbilla/databases/(default)/documents/';
const field=v=>v===null?{nullValue:null}:Array.isArray(v)?{arrayValue:{values:v.map(field)}}:typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,field(v)]))}}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='boolean'?{booleanValue:v}:{stringValue:v};
const jwt=(uid,email=uid+'@example.com')=>{const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');return enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,user_id:uid,aud:'demo-villalbilla',iss:'https://securetoken.google.com/demo-villalbilla',email,email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'password'}})+'.'};
async function req(path,token,body){const r=await fetch(base+path,{method:body?'PATCH':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify({fields:field(body).mapValue.fields})}:{})});return {status:r.status,body:await r.json()}}
(async()=>{
const claim={teamId:'a',teamIds:['a','b'],name:'Entrenador',category:'Infantil',teamName:'Club',role:'trainer'};
for(const [uid,status,c]of [['coach','approved',claim],['other','approved',claim],['pending','pending',claim],['revoked','revoked',claim],['player','approved',{...claim,role:'player'}],['legacy','approved',{teamId:'a',name:'Antiguo',category:'Club',teamName:'Club'}]])assert.equal((await req('trainerProfiles/'+uid,'owner',{uid,email:uid+'@example.com',status,claim:c})).status,200);
for(const team of ['a','b'])assert.equal((await req('teamWorkspaces/'+team,jwt('coach'),{data:{attendance:{'2026-10-26':{player:'Sí'}},materials:[]}})).status,200);
assert.equal((await req('teamWorkspaces/a',jwt('other'))).status,200);
const shared={playerDetails:{'908562':{alias:'Pepe',position:'Defensa'}},lineups:[{id:'shared',starters:['908562'],positions:{'908562':{x:33.25,y:74}}}]};
assert.equal((await req('teamWorkspaces/a',jwt('coach'),{data:shared})).status,200);
let received=await req('teamWorkspaces/a',jwt('other'));
assert.equal(received.body.fields.data.mapValue.fields.playerDetails.mapValue.fields['908562'].mapValue.fields.alias.stringValue,'Pepe');
shared.playerDetails['908562'].position='Mediocentro';shared.lineups[0].positions['908562'].x=47.5;
assert.equal((await req('teamWorkspaces/a',jwt('other'),{data:shared})).status,200);
received=await req('teamWorkspaces/a',jwt('coach'));
assert.equal(received.body.fields.data.mapValue.fields.playerDetails.mapValue.fields['908562'].mapValue.fields.position.stringValue,'Mediocentro');
const x=received.body.fields.data.mapValue.fields.lineups.arrayValue.values[0].mapValue.fields.positions.mapValue.fields['908562'].mapValue.fields.x;assert.equal(Number(x.integerValue??x.doubleValue),47.5);

shared.playerDetails['908562'].minuteEntries={coach1:{minutes:20,createdAt:'2026-10-27T12:00:00Z'}};assert.equal((await req('teamWorkspaces/a',jwt('coach'),{data:shared})).status,200);shared.playerDetails['908562'].minuteEntries.coach2={minutes:15,createdAt:'2026-10-27T12:01:00Z'};assert.equal((await req('teamWorkspaces/a',jwt('other'),{data:shared})).status,200);received=await req('teamWorkspaces/a',jwt('coach'));const entries=received.body.fields.data.mapValue.fields.playerDetails.mapValue.fields['908562'].mapValue.fields.minuteEntries.mapValue.fields;assert.equal(Number(entries.coach1.mapValue.fields.minutes.integerValue)+Number(entries.coach2.mapValue.fields.minutes.integerValue),35);

for(const uid of ['pending','revoked','player'])assert.equal((await req('teamWorkspaces/a',jwt(uid),{data:{}})).status,403,uid);
assert.equal((await req('teamWorkspaces/c',jwt('coach'),{data:{}})).status,403);
assert.equal((await req('teamWorkspaces/a',jwt('legacy'))).status,200);assert.equal((await req('teamWorkspaces/b',jwt('legacy'))).status,403);
assert.equal((await req('trainerProfiles/coach',jwt('coach'),{uid:'coach',email:'coach@example.com',status:'approved',claim:{...claim,teamIds:['a','b','c']}})).status,403);
const notice={id:'notice-1',title:'Acceso aceptado',body:'Ya puedes acceder',queued:false};
assert.equal((await req('trainerProfiles/pending',jwt('pending'),{uid:'pending',email:'pending@example.com',status:'approved',claim,accessNotice:notice})).status,403);
assert.equal((await req('trainerProfiles/pending',jwt('admin','appvillalbilla@gmail.com'),{uid:'pending',email:'pending@example.com',status:'approved',claim,accessNotice:notice})).status,200);
const approved=await req('trainerProfiles/pending',jwt('pending'));assert.equal(approved.status,200);assert.equal(approved.body.fields.accessNotice.mapValue.fields.id.stringValue,'notice-1');
assert.equal((await req('trainerProfiles/pending',jwt('other'))).status,403);
assert.equal((await req('trainerProfiles/new-self',jwt('new-self'),{uid:'new-self',email:'new-self@example.com',status:'unassigned',claim:null,accessNotice:notice})).status,403);
console.log('Firestore emulator: alias, posiciones, alineación y minutos manuales compartidos entre dos entrenadores; multi-equipo, aislamiento, jugador, pendiente, revocado y perfil antiguo correctos.');
})().catch(e=>{console.error(e);process.exit(1)});
