import {decodeJwt} from 'jose';
import {verifyAccessUser} from './access-service.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import catalog from './social-candidates.json' with {type:'json'};
import matches from './social-matches.json' with {type:'json'};
import names from './name-search.cjs';
const validMatches=new Set(matches),season='2026-27',categories=['team','player','trainer'];
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}}),error=(text,status=400)=>Object.assign(Error(text),{status});
const authors=new Map();
async function author(request,uid){
 const old=authors.get(uid);if(old?.until>Date.now())return old.name;
 const r=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(10000)});if(!r.ok)throw error('No se pudo consultar tu perfil.',503);const f=(await r.json()).fields,approved=['approved','admin'].includes(f?.status?.stringValue),name=(approved?f?.claim?.mapValue?.fields?.name?.stringValue:null)||f?.name?.stringValue;
 const safe=name&&!name.includes('@')?name.slice(0,100):'Usuario del club';if(authors.size>1000)authors.clear();authors.set(uid,{name:safe,until:Date.now()+300000});return safe;
}
async function verifySocialUser(request){const uid=await verifyAccessUser(request);const token=request.headers.get('Authorization').slice(7);if(decodeJwt(token).firebase?.sign_in_provider==='anonymous')throw error('Inicia sesión con tu cuenta para participar.',401);return uid}
export async function handleSocial(request,env,{verify=verifySocialUser,getAuthor=author,authorize=verifyAdmin}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/social/'))return null;
 try{
  const db=env.CHAT_DB;if(!db)throw error('La participación no está disponible.',503);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw error('Origen no permitido.',403);
  if(!['GET','POST','DELETE'].includes(request.method))return reply({error:'Método no permitido.'},405);
  const write=request.method!=='GET',uid=write||request.headers.has('Authorization')?await verify(request):null;
  let data={};if(write&&request.method!=='DELETE'){const raw=await request.text();if(raw.length>5000)throw error('Solicitud demasiado grande.',413);try{data=JSON.parse(raw)}catch{throw error('Solicitud no válida.')}if(!data||typeof data!=='object')throw error('Solicitud no válida.')}
  const match=url.searchParams.get('match'),category=url.searchParams.get('category');
  if(url.pathname==='/api/social/match'){
   if(!validMatches.has(match))throw error('Partido no disponible.');
   if(request.method==='POST'){
    if(typeof data.liked==='boolean'){if(data.liked)await db.prepare('INSERT OR IGNORE INTO social_likes VALUES(?,?,?)').bind(match,uid,Date.now()).run();else await db.prepare('DELETE FROM social_likes WHERE match_id=? AND uid=?').bind(match,uid).run()}
    else {
     const body=typeof data.body==='string'?data.body.trim():'';if(!body||body.length>500||!/^[a-zA-Z0-9_-]{1,100}$/.test(data.id||''))throw error('El comentario debe tener entre 1 y 500 caracteres.');
     const old=await db.prepare('SELECT uid,match_id,body FROM social_comments WHERE id=?').bind(data.id).first();
     if(old){if(old.uid!==uid||old.match_id!==match||old.body!==body)throw error('Comentario no válido.',409)}
     else{const rate=await db.prepare('SELECT COUNT(*) n FROM social_comments WHERE uid=? AND created_at>?').bind(uid,Date.now()-600000).first();if(rate.n>=5)throw error('Puedes publicar hasta 5 comentarios cada 10 minutos.',429);await db.prepare('INSERT INTO social_comments VALUES(?,?,?,?,?,?)').bind(data.id,match,uid,await getAuthor(request,uid),body,Date.now()).run()}
    }
   }else if(request.method==='DELETE'){
    const id=url.searchParams.get('id');const old=await db.prepare('SELECT uid FROM social_comments WHERE id=? AND match_id=?').bind(id,match).first();if(old&&old.uid!==uid)await authorize(request,env);if(old)await db.prepare('DELETE FROM social_comments WHERE id=? AND match_id=?').bind(id,match).run();
   }
   const likes=await db.prepare('SELECT COUNT(*) n FROM social_likes WHERE match_id=?').bind(match).first(),mine=uid?await db.prepare('SELECT uid FROM social_likes WHERE match_id=? AND uid=?').bind(match,uid).first():null;
   const rows=await db.prepare('SELECT id,uid,author,body,created_at AS createdAt FROM social_comments WHERE match_id=? ORDER BY created_at DESC LIMIT 50').bind(match).all();return reply({likes:likes.n,liked:!!mine,comments:rows.results.reverse().map(({uid:owner,...c})=>({...c,own:owner===uid}))});
  }
  if(url.pathname==='/api/social/votes'){
   if(!categories.includes(category))throw error('Votación no válida.');
   if(request.method==='POST'){if(!catalog[category].some(c=>c.id===data.candidateId))throw error('Selecciona una candidatura de la lista oficial.');await db.prepare('INSERT INTO social_votes VALUES(?,?,?,?,?) ON CONFLICT(season,category,uid) DO UPDATE SET candidate_id=excluded.candidate_id,updated_at=excluded.updated_at').bind(season,category,uid,data.candidateId,Date.now()).run()}
   if(request.method==='DELETE')await db.prepare('DELETE FROM social_votes WHERE season=? AND category=? AND uid=?').bind(season,category,uid).run();
   const mine=uid?await db.prepare('SELECT candidate_id AS id FROM social_votes WHERE season=? AND category=? AND uid=?').bind(season,category,uid).first():null,rows=await db.prepare('SELECT candidate_id AS id,COUNT(*) AS votes FROM social_votes WHERE season=? AND category=? GROUP BY candidate_id ORDER BY votes DESC,candidate_id LIMIT 10').bind(season,category).all();let rank=0,last=null;const top=rows.results.map((r,i)=>{if(r.votes!==last)rank=i+1;last=r.votes;return {...catalog[category].find(c=>c.id===r.id),...r,rank}});
   return reply({season,myVote:mine?.id||null,top,candidates:catalog[category].filter(c=>names.matchesPersonQuery(c.name,(url.searchParams.get('q')||'').slice(0,100))).slice(0,30)});
  }
  return reply({error:'Ruta no disponible.'},404);
 }catch(e){return reply({error:e.status?e.message:'No se pudo guardar o consultar la participación.'},e.status||503)}
}
