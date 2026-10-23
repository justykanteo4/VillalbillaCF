const {cleanName}=require('../team-identity.cjs');
const {addComments}=require('./comments.cjs');
const teams=require('../teams.json');
function pageData(html){const m=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!m)throw Error('Respuesta federativa inválida');return JSON.parse(m[1]).props.pageProps}
function fixture(m,round){return {id:String(m.codacta),round:Number(round),date:m.fecha?m.fecha.split('-').reverse().join('-'):null,time:m.hora||null,venue:m.campo||null,venueId:m.codigo_campo||null,homeId:String(m.codigo_equipo_local),awayId:String(m.codigo_equipo_visitante),home:cleanName(m.equipo_local),away:cleanName(m.equipo_visitante),homeScore:/^\d+$/.test(m.goles_casa)?Number(m.goles_casa):null,awayScore:/^\d+$/.test(m.goles_visitante)?Number(m.goles_visitante):null}}
function parseTeam(html,team){const p=pageData(html);if(String(p.query.grupo)!==team.group||String(p.query.temporada)!=='22'||!Array.isArray(p.calendar?.rounds))throw Error('Competición no válida');const fixtures=p.calendar.rounds.flatMap(r=>(r.equipos||[]).filter(m=>m.codigo_equipo_local===team.id||m.codigo_equipo_visitante===team.id).map(m=>fixture(m,r.codjornada)));if(!fixtures.length)throw Error('Equipo sin partidos en este grupo');return {...team,fixtures,updatedAt:new Date().toISOString(),error:false}}
const groupCache=new Map();
async function groupFixtures(teamId){const team=teams.find(t=>t.id===String(teamId));if(!team)return null;const key=team.competition+':'+team.group,old=groupCache.get(key);if(old&&Date.now()-old.time<300000)return old.fixtures;const url=`https://www.rffm.es/competicion/calendario?competicion=${team.competition}&grupo=${team.group}&temporada=22&tipojuego=${team.gameType}`,response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Calendario no disponible');const p=pageData(await response.text());if(String(p.query.grupo)!==team.group||String(p.query.temporada)!=='22'||!Array.isArray(p.calendar?.rounds))throw Error('Competición no válida');const fixtures=p.calendar.rounds.flatMap(r=>(r.equipos||[]).filter(m=>m.codacta&&m.codigo_equipo_local&&m.codigo_equipo_visitante).map(m=>fixture(m,r.codjornada)));groupCache.set(key,{time:Date.now(),fixtures});return fixtures}
let last=require('../news-seed.json'),flight=null,checked=0;
async function refreshNews({persistComments=true}={}){if(flight)return flight;if(Date.now()-checked<5*60*1000)return last;flight=(async()=>{const fetched=[];const pages=new Map();for(const team of teams){const key=team.competition+':'+team.group;if(!pages.has(key))pages.set(key,null)}const keys=[...pages.keys()];for(let i=0;i<keys.length;i+=3){await Promise.all(keys.slice(i,i+3).map(async key=>{const t=teams.find(t=>t.competition+':'+t.group===key);try{const u=`https://www.rffm.es/competicion/calendario?competicion=${t.competition}&grupo=${t.group}&temporada=22&tipojuego=${t.gameType}`;const res=await fetch(u,{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error();pages.set(key,await res.text())}catch{pages.set(key,null)}}))}for(const team of teams){try{fetched.push(parseTeam(pages.get(team.competition+':'+team.group)||'',team))}catch{const old=last.teams.find(t=>t.id===team.id);fetched.push({...team,fixtures:old?.fixtures||[],updatedAt:old?.updatedAt||null,error:true})}}checked=Date.now();last=addComments({checkedAt:new Date().toISOString(),teams:fetched},{persist:persistComments});return last})().finally(()=>{flight=null});return flight}
let igCache=null,igChecked=0;
async function instagram(accessToken=process.env.INSTAGRAM_ACCESS_TOKEN,facebookAccessToken=process.env.INSTAGRAM_FACEBOOK_ACCESS_TOKEN){
 const target='villalbillacf';
 if(!accessToken&&!facebookAccessToken)return {connected:false,username:target,posts:[]};
 if(igCache&&Date.now()-igChecked<5*60*1000)return igCache;
 try{
  let mediaUrl,token=accessToken;
  if(facebookAccessToken){
   const pagesUrl=new URL('https://graph.facebook.com/me/accounts');
   pagesUrl.searchParams.set('fields','id,name,access_token,instagram_business_account{id,username}');
   pagesUrl.searchParams.set('limit','100');
   const pagesResponse=await fetch(pagesUrl,{headers:{Authorization:'Bearer '+facebookAccessToken},signal:AbortSignal.timeout(15000)});
   if(!pagesResponse.ok)throw Error('facebook pages');
   const pages=await pagesResponse.json();
   const page=(pages.data||[]).find(p=>p.instagram_business_account?.username?.toLowerCase()===target&&p.access_token);
   if(!page)throw Error('instagram page not linked');
   token=page.access_token;
   mediaUrl=new URL(`https://graph.facebook.com/${page.instagram_business_account.id}/media`);
  }else{
   const profile=await fetch('https://graph.instagram.com/me?fields=id,username',{headers:{Authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(15000)});
   if(!profile.ok)throw Error('instagram profile');
   const owner=await profile.json();
   if(owner.username?.toLowerCase()!==target)throw Error('wrong instagram account');
   mediaUrl=new URL('https://graph.instagram.com/me/media');
  }
  mediaUrl.searchParams.set('fields','id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}');
  mediaUrl.searchParams.set('limit','24');
  const response=await fetch(mediaUrl,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('instagram media');
  const data=await response.json();
  if(!Array.isArray(data.data))throw Error('instagram response');
  igCache={connected:true,username:target,updatedAt:new Date().toISOString(),posts:data.data.map(m=>({id:m.id,caption:m.caption||'',date:m.timestamp,images:(m.children?.data||[m]).map(c=>c.media_type==='VIDEO'?c.thumbnail_url:c.media_url).filter(x=>typeof x==='string'&&x.startsWith('https://'))}))};
  igChecked=Date.now();
  return igCache;
 }catch{return {...(igCache||{connected:false,username:target,posts:[]}),error:true}}
}
module.exports={parseTeam,pageData,refreshNews,instagram,groupFixtures};
