import {adminVotes,voterIdentity} from './admin-votes.mjs';
import {dispatchVoteNotifications} from './vote-notifications.mjs';
import {readPost,mediaStatements,serveMedia} from './social-media.mjs';
import {decodeJwt} from 'jose';
import {verifyAccessUser} from './access-service.mjs';
import {verifyAdmin} from './free-notifications.mjs';
import catalog from './social-candidates.json' with {type:'json'};
import matches from './social-matches.json' with {type:'json'};
import names from './name-search.cjs';
const validMatches=new Set(matches),season='2026-27',categories=['team','player','trainer','goalkeeper'];
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}}),error=(text,status=400)=>Object.assign(Error(text),{status});
const authors=new Map();
async function author(request,uid){
 const old=authors.get(uid);if(old?.until>Date.now())return old.profile;
 const r=await fetch('https://firestore.googleapis.com/v1/projects/villalbillacf/databases/(default)/documents/trainerProfiles/'+encodeURIComponent(uid),{headers:{Authorization:request.headers.get('Authorization')},signal:AbortSignal.timeout(10000)});if(!r.ok)throw error('No se pudo consultar tu perfil.',503);const f=(await r.json()).fields,approved=['approved','admin'].includes(f?.status?.stringValue),name=(approved?f?.claim?.mapValue?.fields?.name?.stringValue:null)||f?.name?.stringValue;
 const safe=name&&!name.includes('@')?name.slice(0,100):'Usuario del club',claim=approved?f?.claim?.mapValue?.fields:null,playerId=claim?.playerId?.stringValue||claim?.playerTeams?.arrayValue?.values?.[0]?.mapValue?.fields?.playerId?.stringValue||null,teamId=claim?.teamId?.stringValue||null;
 const picture=decodeJwt(request.headers.get('Authorization').slice(7)).picture;let photo=null;try{const u=new URL(picture);if(u.protocol==='https:'&&/(^|\.)googleusercontent\.com$/.test(u.hostname)&&picture.length<2048)photo=picture}catch{}
 const trainer=approved?catalog.trainer.find(p=>p.teamId===teamId&&names.matchesPersonQuery(p.name,safe)):null;const profile={name:safe,playerId:playerId||trainer?.playerId||null,teamId,photo:photo||trainer?.photo||null};if(authors.size>1000)authors.clear();authors.set(uid,{profile,until:Date.now()+300000});return profile;
}
async function verifySocialUser(request){const uid=await verifyAccessUser(request);const token=request.headers.get('Authorization').slice(7);if(decodeJwt(token).firebase?.sign_in_provider==='anonymous')throw error('Inicia sesión con tu cuenta para participar.',401);return uid}
export async function handleSocial(request,env,{verify=verifySocialUser,getAuthor=author,authorize=verifyAdmin,getVoterIdentity=voterIdentity,ctx}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/social/'))return null;
 try{
  const db=env.CHAT_DB;if(!db)throw error('La participación no está disponible.',503);
  if(url.pathname==='/api/social/media'&&['GET','HEAD'].includes(request.method))return serveMedia(request,db);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)throw error('Origen no permitido.',403);
  if(!['GET','POST','DELETE'].includes(request.method))return reply({error:'Método no permitido.'},405);
  if(url.pathname==='/api/social/admin/votes'){await authorize(request,env);if(request.method!=='GET')return reply({error:'Método no permitido.'},405);return reply(await adminVotes({request,db,category:url.searchParams.get('category'),season,catalog,getIdentity:getVoterIdentity}))}
  const write=request.method!=='GET',uid=write||request.headers.has('Authorization')?await verify(request):null;
  let data={};if(write&&request.method!=='DELETE')data=await readPost(request);
  const match=url.searchParams.get('match'),category=url.searchParams.get('category');
  if(url.pathname==='/api/social/match'){
   if(!validMatches.has(match))throw error('Partido no disponible.');
   if(request.method==='POST'){
    if(typeof data.liked==='boolean'){if(data.liked)await db.prepare('INSERT OR IGNORE INTO social_likes VALUES(?,?,?)').bind(match,uid,Date.now()).run();else await db.prepare('DELETE FROM social_likes WHERE match_id=? AND uid=?').bind(match,uid).run()}
    else {
     const body=typeof data.body==='string'?data.body.trim():'';if((!body&&!data.media)||body.length>500||!/^[a-zA-Z0-9_-]{1,100}$/.test(data.id||''))throw error('El comentario debe tener entre 1 y 500 caracteres.');
     const old=await db.prepare('SELECT uid,match_id,body FROM social_comments WHERE id=?').bind(data.id).first();
     if(old){const media=await db.prepare('SELECT digest FROM social_media WHERE id=?').bind(data.id).first();if(old.uid!==uid||old.match_id!==match||old.body!==body||(media?.digest||null)!==(data.media?.digest||null))throw error('Comentario no válido.',409)}
     else{const rate=await db.prepare('SELECT COUNT(*) n FROM social_comments WHERE uid=? AND created_at>?').bind(uid,Date.now()-600000).first();if(rate.n>=5)throw error('Puedes publicar hasta 5 comentarios cada 10 minutos.',429);const rawAuthor=await getAuthor(request,uid),profile=typeof rawAuthor==='string'?{name:rawAuthor}:rawAuthor,now=Date.now();await db.batch([
 db.prepare('INSERT INTO social_comments VALUES(?,?,?,?,?,?)').bind(data.id,match,uid,profile.name,body,now),
 db.prepare('INSERT INTO social_comment_profiles VALUES(?,?,?,?)').bind(data.id,profile.photo||null,profile.playerId||null,profile.teamId||null),
 ...mediaStatements(db,data.id,uid,data.media,now)])}
    }
   }else if(request.method==='DELETE'){
    const id=url.searchParams.get('id');const old=await db.prepare('SELECT uid FROM social_comments WHERE id=? AND match_id=?').bind(id,match).first();if(old&&old.uid!==uid)await authorize(request,env);if(old)await db.batch([db.prepare('DELETE FROM social_comments WHERE id=? AND match_id=?').bind(id,match),...['social_comment_profiles','social_media_chunks','social_media'].map(table=>db.prepare('DELETE FROM '+table+' WHERE id=?').bind(id))]);
   }
   const likes=await db.prepare('SELECT COUNT(*) n FROM social_likes WHERE match_id=?').bind(match).first(),mine=uid?await db.prepare('SELECT uid FROM social_likes WHERE match_id=? AND uid=?').bind(match,uid).first():null;
   const rows=await db.prepare('SELECT c.id,c.uid,c.author,c.body,c.created_at AS createdAt,p.photo,p.player_id AS playerId,p.team_id AS teamId,m.mime AS mediaType,m.size AS mediaSize FROM social_comments c LEFT JOIN social_comment_profiles p ON p.id=c.id LEFT JOIN social_media m ON m.id=c.id WHERE c.match_id=? ORDER BY c.created_at DESC LIMIT 50').bind(match).all();return reply({likes:likes.n,liked:!!mine,comments:rows.results.reverse().map(({uid:owner,...c})=>({...c,mediaUrl:c.mediaType?'/api/social/media?id='+encodeURIComponent(c.id):null,own:owner===uid}))});
  }
  if(url.pathname==='/api/social/votes'){
   if(!categories.includes(category))throw error('Votación no válida.');
   const points=request.method==='DELETE'?Number(url.searchParams.get('points')||1):Number(data.points??1);
   if(write&&![1,2,3].includes(points))throw error('Elige 3, 2 o 1 punto.');
   if(request.method==='POST'){
    if(!catalog[category].some(c=>c.id===data.candidateId))throw error('Selecciona una candidatura de la lista oficial.');
    const duplicate=await db.prepare('SELECT points FROM social_ballots WHERE season=? AND category=? AND uid=? AND candidate_id=? AND points<>?').bind(season,category,uid,data.candidateId,points).first();
    if(duplicate)throw error('Este candidato ya tiene '+duplicate.points+' puntos. Elige otro o retira primero esa elección.',409);
    try{await db.prepare('INSERT INTO social_ballots VALUES(?,?,?,?,?,?) ON CONFLICT(season,category,uid,points) DO UPDATE SET candidate_id=excluded.candidate_id,updated_at=excluded.updated_at').bind(season,category,uid,points,data.candidateId,Date.now()).run()}catch(e){if(/UNIQUE/.test(e.message))throw error('No puedes repetir candidato en la misma votación.',409);throw e}
   }
   if(request.method==='DELETE')await db.prepare('DELETE FROM social_ballots WHERE season=? AND category=? AND uid=? AND points=?').bind(season,category,uid,points).run();
   if(request.method==='POST')ctx?.waitUntil?.(dispatchVoteNotifications(env).catch(()=>{}));
   const mine=uid?await db.prepare('SELECT candidate_id AS id,points FROM social_ballots WHERE season=? AND category=? AND uid=? ORDER BY points DESC').bind(season,category,uid).all():{results:[]},rows=await db.prepare('SELECT candidate_id AS id,SUM(points) AS points,COUNT(*) AS votes FROM social_ballots WHERE season=? AND category=? GROUP BY candidate_id ORDER BY points DESC,candidate_id').bind(season,category).all();let rank=0,last=null;const top=rows.results.map((r,i)=>{if(r.points!==last)rank=i+1;last=r.points;return {...catalog[category].find(c=>c.id===r.id),...r,rank}});
   const quota=uid?await db.prepare('SELECT changes,seen_mask FROM social_ballot_limits WHERE season=? AND category=? AND uid=?').bind(season,category,uid).first():null;
   return reply({season,changeLimit:4,changesUsed:quota?.changes||0,changesRemaining:4-(quota?.changes||0),initializedPoints:[1,2,3].filter(p=>((quota?.seen_mask||0)&(1<<p))!==0),myVote:mine.results.find(r=>r.points===1)?.id||null,myBallot:mine.results.map(r=>({...catalog[category].find(c=>c.id===r.id),...r})),top,candidates:catalog[category].filter(c=>names.matchesPersonQuery(c.name,(url.searchParams.get('q')||'').slice(0,100))).slice(0,30)});
  }
  return reply({error:'Ruta no disponible.'},404);
 }catch(e){if(/MEDIA_STORAGE_LIMIT/.test(e.message))return reply({error:'El espacio gratuito para fotos y vídeos está lleno. Puedes publicar solo texto o eliminar archivos anteriores.'},409);if(/MEDIA_USER_LIMIT/.test(e.message))return reply({error:'Has alcanzado los 16 MB de archivos en 24 horas. Puedes publicar solo texto.'},429);if(/VOTE_CHANGE_LIMIT/.test(e.message))return reply({error:'Has agotado los cuatro cambios de esta categoría.',changesRemaining:0,changeLimit:4},409);return reply({error:e.status?e.message:'No se pudo guardar o consultar la participación.'},e.status||503)}
}
