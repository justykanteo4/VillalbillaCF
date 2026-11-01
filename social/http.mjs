import {authenticateSocial,fail,text,topicKey,idKey,pageCursor,validTeam} from './auth.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function body(request){const raw=await request.text();if(new TextEncoder().encode(raw).length>16000)throw fail('Mensaje demasiado grande.',413);try{return JSON.parse(raw)}catch{throw fail('Solicitud no válida.')}}
export async function takeBudget(db,uid,now=Date.now()){
 const day=new Date(now).toISOString().slice(0,10);
 const counter=(bucket,max)=>db.prepare('INSERT INTO social_limits(bucket,day,n) VALUES (?,?,1) ON CONFLICT(bucket,day) DO UPDATE SET n=n+1 WHERE n<? RETURNING n').bind(bucket,day,max);
 const result=await db.batch([counter('user:'+uid,100),counter('all',5000)]);
 if(!result[0].results.length||!result[1].results.length)throw fail('Se ha alcanzado el límite diario de participación. Vuelve mañana.',429);
}
async function ensureTopic(db,topic){if(topic.startsWith('forum:')&&!await db.prepare('SELECT id FROM social_posts WHERE id=? AND deleted=0').bind(topic.slice(6)).first())throw fail('Esta publicación ya no está disponible.',404)}
export function createSocialHandler({authenticate=authenticateSocial}={}){
 return async function handle(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/social/'))return null;
  try{
  if(path==='/api/social/chat'){
   if(!env.TEAM_CHAT)return json({error:'El chat de equipo está pendiente de activar.'},503);
   if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'Conexión de chat no válida.'},426);
   const teamId=url.searchParams.get('team');
   // The room checks identity before exposing history or accepting any operation.
   if(!validTeam(teamId))return json({error:'Equipo no válido.'},400);
   return env.TEAM_CHAT.get(env.TEAM_CHAT.idFromName(teamId)).fetch(request);
  }
   if(!env.NOTIFICATIONS_DB)throw fail('La comunidad está pendiente de activar.',503);
   if(!['GET','POST'].includes(request.method))throw fail('Método no permitido.',405);
   const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
   const actor=await authenticate(token),db=env.NOTIFICATIONS_DB;
   if(path==='/api/social/me')return json({uid:actor.uid,admin:actor.admin,teamId:actor.teamId,trainer:actor.trainer,name:actor.name});
   if(request.method==='GET'){
    const before=pageCursor(url.searchParams.get('before'));
    if(path==='/api/social/posts'){
     const result=await db.prepare('SELECT * FROM social_posts WHERE deleted=0 AND seq<? ORDER BY seq DESC LIMIT 21').bind(before).all();
     const rows=result.results.slice(0,20);return json({posts:rows,next:result.results.length>20?rows.at(-1).seq:null});
    }
    if(path==='/api/social/thread'){
     const topic=topicKey(url.searchParams.get('topic'));await ensureTopic(db,topic);
     const result=await db.prepare('SELECT * FROM social_comments WHERE topic=? AND deleted=0 AND seq<? ORDER BY seq DESC LIMIT 21').bind(topic,before).all();
     const rows=result.results.slice(0,20);
     const likes=await db.prepare('SELECT count(*) AS n FROM social_likes WHERE topic=?').bind(topic).first();
     const mine=await db.prepare('SELECT uid FROM social_likes WHERE topic=? AND uid=?').bind(topic,actor.uid).first();
     return json({comments:rows,likes:likes.n,liked:!!mine,next:result.results.length>20?rows.at(-1).seq:null});
    }
    if(path==='/api/social/reports'){
     if(!actor.admin)throw fail('Acceso reservado a administradores.',403);
     return json({reports:(await db.prepare(`SELECT r.*,CASE r.target_type WHEN 'post' THEN (SELECT title || ': ' || body FROM social_posts WHERE id=r.target_id) ELSE (SELECT body FROM social_comments WHERE id=r.target_id) END AS content FROM social_reports r WHERE r.resolved=0 AND r.seq<? ORDER BY r.seq DESC LIMIT 20`).bind(before).all()).results});
    }
    throw fail('Ruta no encontrada.',404);
   }
   const value=await body(request),now=Date.now();
   if(path==='/api/social/posts'){
    const title=text(value.title,120),copy=text(value.body,4000);await takeBudget(db,actor.uid);
    const post={id:crypto.randomUUID(),title,body:copy,author_uid:actor.uid,author_name:actor.name,created_at:now};
    await db.prepare('INSERT INTO social_posts(id,title,body,author_uid,author_name,created_at) VALUES (?,?,?,?,?,?)').bind(post.id,title,copy,actor.uid,actor.name,now).run();return json({post},201);
   }
   if(path==='/api/social/comment'){
    const topic=topicKey(value.topic),copy=text(value.body);await ensureTopic(db,topic);await takeBudget(db,actor.uid);
    const id=crypto.randomUUID();await db.prepare('INSERT INTO social_comments(id,topic,body,author_uid,author_name,created_at) VALUES (?,?,?,?,?,?)').bind(id,topic,copy,actor.uid,actor.name,now).run();return json({id},201);
   }
   if(path==='/api/social/like'){
    const topic=topicKey(value.topic);if(typeof value.liked!=='boolean')throw fail('Indica si te gusta la publicación.');
    await ensureTopic(db,topic);await takeBudget(db,actor.uid);
    if(value.liked)await db.prepare('INSERT OR IGNORE INTO social_likes(topic,uid,created_at) VALUES (?,?,?)').bind(topic,actor.uid,now).run();
    else await db.prepare('DELETE FROM social_likes WHERE topic=? AND uid=?').bind(topic,actor.uid).run();
    return json({liked:value.liked});
   }
   if(path==='/api/social/delete'){
    const id=idKey(value.id),table=value.kind==='post'?'social_posts':value.kind==='comment'?'social_comments':null;if(!table)throw fail('Contenido no válido.');
    const row=await db.prepare('SELECT * FROM '+table+' WHERE id=?').bind(id).first();if(!row)throw fail('Contenido no encontrado.',404);
    if(!actor.admin&&row.author_uid!==actor.uid)throw fail('Solo puedes eliminar tus propias publicaciones.',403);
    await takeBudget(db,actor.uid);
    await db.prepare('UPDATE '+table+" SET deleted=1,body=''"+(value.kind==='post'?",title='Publicación eliminada'":'')+' WHERE id=?').bind(id).run();
    await db.prepare('UPDATE social_reports SET resolved=1 WHERE target_type=? AND target_id=?').bind(value.kind,id).run();return json({deleted:true});
   }
   if(path==='/api/social/report'){
    const id=idKey(value.id),kind=value.kind,table=kind==='post'?'social_posts':kind==='comment'?'social_comments':null;
    if(!table||!await db.prepare('SELECT id FROM '+table+' WHERE id=? AND deleted=0').bind(id).first())throw fail('Contenido no encontrado.',404);
    const reason=text(value.reason,300);await takeBudget(db,actor.uid);
    await db.prepare('INSERT OR IGNORE INTO social_reports(target_type,target_id,reporter_uid,reason,created_at) VALUES (?,?,?,?,?)').bind(kind,id,actor.uid,reason,now).run();return json({reported:true});
   }
   if(path==='/api/social/resolve'){
    if(!actor.admin)throw fail('Acceso reservado a administradores.',403);
    const seq=pageCursor(value.seq);await takeBudget(db,actor.uid);
    await db.prepare('UPDATE social_reports SET resolved=1 WHERE seq=?').bind(seq).run();return json({resolved:true});
   }
   throw fail('Ruta no encontrada.',404);
  }catch(e){return json({error:e.status?e.message:'La comunidad no está disponible ahora. Inténtalo más tarde.'},e.status||503)}
 };
}
export const handleSocial=createSocialHandler();
