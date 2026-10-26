const http=require('http'),fs=require('fs'),path=require('path');
const {clubStats}=require('./club-stats.cjs');
const {refreshNews,instagram}=require('./news.cjs'),auth=require('./accounts.cjs');
const {SOURCE,parseCalendar}=require('../calendar-source.cjs');
const {standings}=require('./standings.cjs');
const {matchDetails}=require('./match.cjs');
const {sanctions}=require('./sanctions.cjs');
const {scorers,leagueScorers}=require('./scorers.cjs');
const {field}=require('./fields.cjs');
const {weather}=require('./weather.cjs');
const {getPlayers,teamRoster}=require('./players.cjs');
const {playerMinutes}=require('./minutes.cjs');
const {teamStaff}=require('./staff.cjs');
const sessionStore=require('./sessions.cjs'),emailAuth=require('./email-auth.cjs');
const root=path.resolve(__dirname,'../dist');
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096)throw Error('too large')}return JSON.parse(text)}
const server=http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost'),bearer=(req.headers.authorization||'').replace(/^Bearer /,''),token=bearer&&bearer!=='cookie'?bearer:sessionStore.cookieToken(req);
 if(req.method==='POST'&&req.headers.origin){const expected=process.env.PUBLIC_APP_URL||((process.env.NODE_ENV==='production'||process.env.SESSION_COOKIE_SECURE==='true')?'https://':'http://')+req.headers.host;if(req.headers.origin!==expected)return json(res,403,{error:'Origen de solicitud no permitido.'})}
 if(u.pathname==='/api/standings'&&req.method==='GET'){const data=await standings(u.searchParams.get('team'));return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/match'&&req.method==='GET'){const data=await matchDetails(u.searchParams.get('team'),u.searchParams.get('match'),{refresh:u.searchParams.get('refresh')==='1'});return json(res,data?200:404,data||{error:'Partido no encontrado.'})}
 if(u.pathname==='/api/sanctions'&&req.method==='GET'){const data=await sanctions(u.searchParams.get('team'),{scope:u.searchParams.get('scope')==='team'?'team':'all'});return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/scorers'&&req.method==='GET')return json(res,200,await scorers());
 if(u.pathname==='/api/league-scorers'&&req.method==='GET'){const data=await leagueScorers(u.searchParams.get('team'));return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/field'&&req.method==='GET'){const data=await field(u.searchParams.get('id'));return json(res,data?200:404,data||{error:'Campo no encontrado.'})}
 if(u.pathname==='/api/weather'&&req.method==='GET')return json(res,200,await weather(u.searchParams.get('field'),u.searchParams.get('date'),u.searchParams.get('time')));
 if(u.pathname==='/api/players'&&req.method==='GET'){const data=await getPlayers(u.searchParams.get('team'));return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/player-minutes'&&req.method==='GET'){const data=await playerMinutes(u.searchParams.get('team'),u.searchParams.get('player'));return json(res,data?200:404,data||{error:'Jugador no encontrado.'})}
 if(u.pathname==='/api/team-roster'&&req.method==='GET'){const data=await teamRoster(u.searchParams.get('team'));return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/team-staff'&&req.method==='GET'){const data=await teamStaff(u.searchParams.get('team'));return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/team-ranking'&&req.method==='GET'){const data=await getPlayers(u.searchParams.get('team'));if(!data)return json(res,404,{error:'Equipo no encontrado.'});let minutesError=false;let players=data.players.map(p=>({...p,minutes:null}));if(u.searchParams.get('metric')==='minutes'){try{const totals=await require('./minutes.cjs').teamMinutes(data);if(!totals.unsupported)players=players.map(p=>{if(p.minutesAllowed!==true)return p;let total=0,partial=false;for(const record of totals.records){if(record.error||record.minutes[p.id]===null)partial=true;else total+=record.minutes[p.id]??0}return {...p,minutes:total,minutesPartial:partial}})}catch{minutesError=true}}return json(res,200,{players,minutesError})}
 if(u.pathname==='/api/club-stats'&&req.method==='GET'){const offset=Number(u.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0||offset>1000)return json(res,400,{error:'Página no válida.'});const data=await clubStats(u.searchParams.get('team'),offset);return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/team-calendar'&&req.method==='GET'){const data=await require('./news.cjs').teamCalendar(u.searchParams.get('team'),u.searchParams.get('current')==='1');return json(res,data?200:404,data||{error:'Equipo no encontrado.'})}
 if(u.pathname==='/api/news'&&req.method==='GET')return json(res,200,await refreshNews());
 if(u.pathname==='/api/instagram'&&req.method==='GET')return json(res,200,await instagram());
 if(u.pathname==='/api/auth/config')return json(res,200,{...auth.config(),emailConfigured:emailAuth.configured()});
 if(u.pathname==='/api/auth/challenge'&&req.method==='POST')return json(res,200,{nonce:auth.challenge()});
 if(u.pathname==='/api/auth/google'&&req.method==='POST'){try{const d=await body(req);const result=await auth.login(d.credential,d.nonce);if(!['android','ios'].includes(req.headers['x-app-platform']))sessionStore.setCookie(res,result.token);return json(res,200,{...result,token:['android','ios'].includes(req.headers['x-app-platform'])?result.token:'cookie'})}catch{return json(res,401,{error:'No se pudo verificar Google. Vuelve a iniciar sesión.'})}}
 if(u.pathname==='/api/auth/email/code'&&req.method==='POST'){try{const d=await body(req);return json(res,200,await emailAuth.requestCode(d.email,d.purpose,req.socket.remoteAddress))}catch(e){return json(res,400,{error:e.message})}}
 if(u.pathname==='/api/auth/email/verify'&&req.method==='POST'){try{const d=await body(req),result=await emailAuth.verify(d.email,d.code,d.purpose,d.password,req.socket.remoteAddress);if(!['android','ios'].includes(req.headers['x-app-platform']))sessionStore.setCookie(res,result.token);return json(res,200,{...result,token:['android','ios'].includes(req.headers['x-app-platform'])?result.token:'cookie'})}catch(e){return json(res,401,{error:e.message})}}
 if(u.pathname==='/api/auth/password'&&req.method==='POST'){try{const d=await body(req),result=emailAuth.passwordLogin(d.email,d.password,req.socket.remoteAddress);if(!['android','ios'].includes(req.headers['x-app-platform']))sessionStore.setCookie(res,result.token);return json(res,200,{...result,token:['android','ios'].includes(req.headers['x-app-platform'])?result.token:'cookie'})}catch(e){return json(res,401,{error:e.message})}}
 if(u.pathname==='/api/auth/me')return json(res,auth.user(token)?200:401,auth.user(token)?{user:auth.user(token)}:{error:'Inicia sesión con Google.'});
 if(u.pathname==='/api/auth/claim'&&req.method==='POST'){if(!auth.user(token))return json(res,401,{error:'Inicia sesión con Google.'});try{const d=await body(req);return json(res,200,{user:auth.claim(token,d.teamId,d.name)})}catch(e){return json(res,400,{error:e.message})}}
 if(u.pathname==='/api/auth/roster'){if(!auth.user(token))return json(res,401,{error:'Inicia sesión con Google.'});const team=require('../teams.json').find(t=>t.id===u.searchParams.get('team'));if(!team)return json(res,404,{error:'Equipo no encontrado.'});const r=await fetch('https://www.rffm.es/fichaequipo/'+team.id,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const t=require('./news.cjs').pageData(await r.text()).team;const people=[['tecnicos_equipo','Entrenador'],['auxiliares_equipo','Auxiliar'],['delegados_equipo','Delegado']].flatMap(([key,role])=>(t?.[key]||[]).map(p=>({name:p.nombre,role})));return json(res,200,{people})}
 if(u.pathname==='/api/admin/users'){if(auth.user(token)?.status!=='admin')return json(res,403,{error:'Acceso reservado al administrador.'});return json(res,200,{users:auth.list(token)})}
 if(u.pathname==='/api/admin/decision'&&req.method==='POST'){if(auth.user(token)?.status!=='admin')return json(res,403,{error:'Acceso reservado al administrador.'});try{const d=await body(req);return json(res,200,{user:auth.decide(token,d.id,d.action)})}catch(e){return json(res,400,{error:e.message})}}
 if(u.pathname==='/api/trainer/login')return json(res,410,{error:'Las claves compartidas se han sustituido por Google.'});
 if(u.pathname==='/api/trainer/session')return json(res,auth.allowed(token)?200:401,auth.allowed(token)?{authenticated:true}:{error:'Inicia sesión como entrenador.'});
 if(u.pathname==='/api/trainer/logout'&&req.method==='POST'){auth.logout(token);sessionStore.clearCookie(res);return json(res,200,{ok:true})}
 if(u.pathname==='/api/calendar'&&req.method==='GET'){const r=await fetch(SOURCE,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();return json(res,200,parseCalendar(await r.text()))}
 if(u.pathname.startsWith('/api/'))return json(res,404,{error:'Servicio no disponible.'});
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Método no permitido.'});
 let file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep))return json(res,403,{error:'Acceso denegado.'});
 fs.readFile(file,(e,b)=>{if(e)return json(res,404,{error:'No encontrado.'});const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':file.endsWith('index.html')?'no-cache':'public, max-age=3600'});res.end(req.method==='HEAD'?undefined:b)})
 }catch{return json(res,502,{error:'No se pudo consultar la fuente. Inténtalo más tarde.'})}});
if(require.main===module){server.listen(Number(process.env.PORT||8081),process.env.HOST||'127.0.0.1');refreshNews().catch(()=>{});setInterval(()=>refreshNews().catch(()=>{}),300000).unref()}
module.exports={server};
