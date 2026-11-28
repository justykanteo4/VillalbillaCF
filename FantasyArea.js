import FantasyRounds from './FantasyRounds';
import FantasyAnimatedPressable from './FantasyAnimatedPressable';
import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable,AppState,Linking} from 'react-native';
import {destinationUrl} from './notification-destination.cjs';
import {fantasyRequest} from './FantasyLeagues';
import FantasySquad,{CoachChoice,SquadReveal} from './FantasySquad';
import FantasyLineup from './FantasyLineup';
import FantasyTrading from './FantasyTrading';
import FantasyTransactions from './FantasyTransactions';
import FantasyTable from './FantasyTable';
import FantasyRivals from './FantasyRivals';
import {Button,ErrorText,text,panel,title,theme} from './FantasyUI';
function ShareLeagueButton({league,onError}){
 async function share(){
  const link='https://villalbilla-cf.albaresfernandez.workers.dev'+destinationUrl({type:'fantasy-league',leagueId:league.id});
  const message='VillalbillaFantasy · '+league.name+'\n'+(league.privateLeague&&league.code?'Código de invitación: '+league.code+'\n':'')+link;
  try{await Linking.openURL('https://wa.me/?text='+encodeURIComponent(message))}
  catch{onError('No se pudo abrir WhatsApp. Inténtalo de nuevo.')}
 }
 return <Button secondary onPress={share}>Compartir por WhatsApp</Button>;
}
export default function FantasyArea({account,section='plantilla',request=fantasyRequest,onFinance=()=>{},preferredLeagueId,onLeagueChange=()=>{}}){
 const [creationEnabled,setCreationEnabled]=useState(false),[eligibleTeams,setEligibleTeams]=useState([]),[creating,setCreating]=useState(false),[creationName,setCreationName]=useState(''),[inviteCode,setInviteCode]=useState(''),[creationBusy,setCreationBusy]=useState(false),[available,setAvailable]=useState([]),[joining,setJoining]=useState(''),[leagues,sl]=useState([]),[id,si]=useState(''),[record,ss]=useState(null),[loading,sb]=useState(true),[error,se]=useState(''),[choosing,sc]=useState(false),[reveal,sr]=useState(false),[saleNotice,setSaleNotice]=useState(''),[lobby,sh]=useState(!preferredLeagueId||['home','new'].includes(preferredLeagueId));
 const presentationDone=useRef(new Set()),joinLock=useRef(false),alive=useRef(true),currentId=useRef(id),currentLobby=useRef(lobby);currentId.current=id;currentLobby.current=lobby;const squad=record?.leagueId===id?record.data:null;const specificLeague=!!preferredLeagueId&&!['home','new','market-notice'].includes(preferredLeagueId);
 function applyLeagues(d){if(!alive.current)return;sl(d.leagues);setAvailable(d.availableLeagues||[]);setCreationEnabled(d.creationEnabled===true);setEligibleTeams(d.eligibleTeams||[]);si(old=>specificLeague?(d.leagues.some(l=>l.id===preferredLeagueId)?preferredLeagueId:''):d.leagues.some(l=>l.id===old)?old:d.leagues.find(l=>l.id===preferredLeagueId)?.id||d.leagues[0]?.id||'')}
 async function loadLeagues(force=false){sb(true);se('');try{applyLeagues(await request('/leagues',{...(force?{cache:'reload'}:{}),onCached:d=>{applyLeagues(d);if(alive.current)sb(false)}}))}catch(e){if(alive.current)se(e.message)}finally{if(alive.current)sb(false)}}
 useEffect(()=>{alive.current=true;loadLeagues();return()=>{alive.current=false}},[account.id]);
 useEffect(()=>{if(preferredLeagueId==='market-notice'){sh(!leagues.length&&!loading)}else if(['home','new'].includes(preferredLeagueId)){sh(true);sr(false);sc(false)}else if(preferredLeagueId&&leagues.some(l=>l.id===preferredLeagueId)){si(preferredLeagueId);sh(false)}else if(preferredLeagueId&&!loading)sh(true)},[preferredLeagueId,leagues,loading]);
 useEffect(()=>{if(id&&!lobby&&(!specificLeague||id===preferredLeagueId))onLeagueChange(id)},[id,lobby,preferredLeagueId]);
 useEffect(()=>{const league=leagues.find(l=>l.id===id);onFinance({leagueId:lobby?'':id,leagueName:lobby?'':league?.name||'',leagues:leagues.map(l=>({id:l.id,name:l.name})),lobby,squadValue:lobby||!Array.isArray(squad?.players)||!squad.players.every(p=>Number.isFinite(p.price))?undefined:squad.players.reduce((total,p)=>total+Math.round(p.price*100),0)/100,reservedBids:lobby?undefined:squad?.finance?.reservedBids??league?.finance?.reservedBids,balance:lobby?undefined:squad?.finance?.balance??league?.finance?.balance,accountId:account.id})},[id,leagues,squad?.finance?.reservedBids,squad?.finance?.balance,squad?.players,lobby,account.id]);
 async function loadSquad(force=true){if(!id||lobby)return;const requested=id;try{const apply=d=>{if(alive.current&&!currentLobby.current&&currentId.current===requested)ss({leagueId:requested,data:d})};const d=await request('/leagues/'+requested+'/squad',{...(force?{cache:'reload'}:{}),onCached:apply});apply(d);if(alive.current&&!currentLobby.current&&currentId.current===requested&&d.manager&&!d.presentationSeen&&!presentationDone.current.has(requested))sr(true)}catch(e){if(alive.current&&!currentLobby.current&&currentId.current===requested)se(e.message)}}
 useEffect(()=>{let active=true;ss(null);se('');sc(false);sr(false);setSaleNotice('');if(id&&!lobby){const apply=d=>{if(active&&currentId.current===id)ss({leagueId:id,data:d})};request('/leagues/'+id+'/squad',{onCached:apply}).then(d=>{apply(d);if(active&&d.manager&&!d.presentationSeen&&!presentationDone.current.has(id))sr(true)}).catch(e=>{if(active)se(e.message)})}return()=>{active=false}},[id,lobby]);
 useEffect(()=>{if(!id||lobby)return;const timer=setInterval(()=>{if(AppState.currentState==='active')loadSquad(false)},60000),listener=AppState.addEventListener('change',state=>{if(state==='active')loadSquad(false)});return()=>{clearInterval(timer);listener.remove()}},[id,lobby]);
 useEffect(()=>{if(!id||lobby)return;let active=true,timer;const requested=id,sections=['market','lineup','search','table','rivals','transactions','players'];let next=0;const warm=async()=>{if(!active||currentLobby.current||currentId.current!==requested||AppState.currentState!=='active'||next>=sections.length)return;try{await request('/leagues/'+requested+'/'+sections[next++])}catch(e){if(e.status===401||e.status===403)return}if(active)timer=setTimeout(warm,1200)};timer=setTimeout(warm,300);return()=>{active=false;clearTimeout(timer)}},[id,lobby]);
 async function sold(sale){if(!alive.current||currentId.current!==id)return;setSaleNotice('Venta realizada: +'+(sale.amountCents/100).toLocaleString('es-ES')+' M. Revisa el once antes del cierre.');ss(v=>v?.leagueId===id?{...v,data:{...v.data,players:v.data.players.filter(p=>p.id!==sale.playerId)}}:v);await loadSquad()}
 async function finish(){const requested=id;presentationDone.current.add(requested);sr(false);ss(v=>v?.leagueId===requested?{...v,data:{...v.data,presentationSeen:true}}:v);try{await request('/leagues/'+requested+'/presentation',{method:'POST',body:'{}'})}catch(e){if(alive.current&&currentId.current===requested)se(e.message)}}
 async function joinLeague(league){
  if(joinLock.current)return;joinLock.current=true;setJoining(league.id);se('');
  try{const candidate=String(account.claim?.name||account.name||'Mi equipo').trim().slice(0,32),nickname=candidate.length>=2?candidate:'Mi equipo',result=await request(league.kind==='public'?'/join-public':'/team-league',{method:'POST',body:JSON.stringify(league.kind==='public'?{leagueId:league.id,nickname}:{teamId:league.teamId,leagueId:league.id,nickname})});if(!alive.current)return;sl(rows=>rows.some(l=>l.id===result.league.id)?rows:[...rows,result.league]);setAvailable(rows=>rows.filter(l=>l.id!==result.league.id));openLeague(result.league.id);loadLeagues(true)}catch(e){if(alive.current)se(e.message)}finally{joinLock.current=false;if(alive.current)setJoining('')}
 }
 async function createLeague(){
  if(creationBusy||!creationEnabled)return;
  const name=creationName.trim().replace(/\s+/g,' ');
  if(name.length<3||name.length>60){se('Escribe un nombre para la liga de 3 a 60 caracteres.');return}
  setCreationBusy(true);se('');
  try{
   const candidate=String(account.claim?.name||account.name||'Mi equipo').trim().slice(0,32),nickname=candidate.length>=2?candidate:'Mi equipo';
   const requestId='league-'+Date.now()+'-'+Math.random().toString(36).slice(2,12);
   const result=await request('/leagues',{method:'POST',body:JSON.stringify({name,nickname,requestId})});
   if(!alive.current)return;
   setCreating(false);setCreationName('');
   sl(old=>old.some(l=>l.id===result.league.id)?old:[...old,result.league]);
   openLeague(result.league.id);
   await loadLeagues(true);
  }catch(e){if(alive.current)se(e.message||'No se pudo crear la liga.')}
  finally{if(alive.current)setCreationBusy(false)}
 }
 async function joinInvitation(){
  if(joinLock.current)return;const code=inviteCode.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)){se('Introduce un código de invitación válido.');return}joinLock.current=true;setJoining('invitation');se('');try{const candidate=String(account.claim?.name||account.name||'Mi equipo').trim().slice(0,32),nickname=candidate.length>=2?candidate:'Mi equipo';const result=await request('/join',{method:'POST',body:JSON.stringify({code,nickname})});if(!alive.current)return;setInviteCode('');sl(old=>old.some(l=>l.id===result.league.id)?old:[...old,result.league]);openLeague(result.league.id);await loadLeagues(true)}catch(e){if(alive.current)se(e.message)}finally{joinLock.current=false;if(alive.current)setJoining('')}}
 function openLeague(leagueId){onLeagueChange(leagueId);si(leagueId);sh(false)}
 if(lobby)return <View style={{gap:20,backgroundColor:theme.background,paddingHorizontal:0,paddingVertical:8,borderRadius:0,width:'100%'}}><View style={{gap:7}}><Text style={{...title,fontSize:29}}>Tus ligas Fantasy</Text></View><ErrorText>{error}</ErrorText>{loading&&!leagues.length&&<Text style={text}>Cargando tus ligas…</Text>}{leagues.map(l=><View key={l.id} style={{...panel,padding:14,borderColor:theme.border,gap:8}}><FantasyAnimatedPressable accessibilityRole="button" accessibilityLabel={'Entrar en '+l.name} onPress={()=>openLeague(l.id)} style={{gap:12}}><Text style={{color:theme.accent,fontSize:12,fontWeight:'800',letterSpacing:1}}>MI LIGA</Text><Text style={{...title,fontSize:23}}>{l.name}</Text><Text style={{...text,color:theme.accent,fontWeight:'900'}}>Entrar a mi liga →</Text></FantasyAnimatedPressable><ShareLeagueButton league={l} onError={se}/></View>)}{available.length>0&&<Text style={{...title,fontSize:23}}>Ligas de tu equipo</Text>}{[...available].sort((a,b)=>Number(b.id===preferredLeagueId)-Number(a.id===preferredLeagueId)).map(l=><View key={l.id} style={{...panel,padding:14,gap:8,borderColor:theme.border}}><Text style={{color:theme.accent,fontSize:12,fontWeight:'800'}}>{l.kind==='public'?'LIGA PÚBLICA DEL EQUIPO':l.canStart?'NUEVA LIGA DEL EQUIPO':'LIGA DISPONIBLE'}</Text><Text style={{...title,fontSize:23}}>{l.name}</Text><Text style={{...text,color:theme.muted}}>{l.memberCount}/{l.maxMembers} participantes · Solo compañeros del equipo</Text><Button disabled={!!joining||l.memberCount>=l.maxMembers} onPress={()=>joinLeague(l)}>{joining===l.id?'Entrando…':l.memberCount>=l.maxMembers?'Liga completa':l.canStart?'Empezar '+l.name:'Unirme a '+l.name}</Button>{!l.canStart&&<ShareLeagueButton league={l} onError={se}/>}</View>)}{!loading&&!leagues.length&&!available.length&&!error&&<Text style={text}>Todavía no hay ligas disponibles para tu equipo confirmado.</Text>}<View style={{...panel,padding:20,gap:12}}><Text style={title}>Unirme a una liga privada</Text><TextInput accessibilityLabel="Código de invitación" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" maxLength={8} placeholder="Código de 8 caracteres" placeholderTextColor={theme.muted} style={{color:theme.text,padding:12,borderWidth:1,borderRadius:10,borderColor:theme.border}}/><Button disabled={!!joining||inviteCode.trim().length!==8} onPress={joinInvitation}>{joining==='invitation'?'Entrando…':'Unirme con invitación'}</Button></View>{creationEnabled&&<View style={{...panel,padding:20,gap:12}}>
 <FantasyAnimatedPressable accessibilityRole="button" accessibilityState={{expanded:creating}} onPress={()=>{setCreating(v=>!v);se('')}}>
  <Text style={{...title,fontSize:23}}>＋ Crear nueva liga</Text>
  <Text style={{...text,color:theme.accent}}>{creating?'Ocultar formulario':'Pulsa para crear una liga'}</Text>
 </FantasyAnimatedPressable>
 {creating&&<>
  <Text style={text}>Nombre de la liga</Text>
  <TextInput accessibilityLabel="Nombre de la nueva liga Fantasy" maxLength={60} value={creationName} onChangeText={setCreationName} placeholder="Ej. Los Galácticos" placeholderTextColor={theme.muted} style={{color:theme.text,padding:12,borderWidth:1,borderRadius:10,borderColor:theme.border,backgroundColor:theme.header}}/>
  <Text style={text}>Liga privada por invitación · Máximo 15 participantes</Text>
  <Button disabled={creationBusy||creationName.trim().length<3} onPress={createLeague}>{creationBusy?'Creando liga…':'Crear liga'}</Button>
 </>}
 </View>}<Button secondary disabled={loading} onPress={()=>loadLeagues(true)}>Actualizar mis ligas</Button></View>;
 return <View style={{gap:14,backgroundColor:theme.background,paddingHorizontal:0,paddingVertical:8,borderRadius:0,width:'100%'}}><ErrorText>{error}</ErrorText>{id&&!squad&&section==='plantilla'&&<Text style={text}>Preparando tu plantilla…</Text>}{id&&squad&&(!squad.manager||choosing)?<CoachChoice key={id} leagueId={id} request={request} onChosen={async()=>{sc(false);await loadSquad()}} onCancel={squad.manager?()=>sc(false):null}/>:id&&section==='rounds'?<FantasyRounds key={id} leagueId={id} teamId={leagues.find(l=>l.id===id)?.teamId} request={request}/>:id&&section==='rivals'?<FantasyRivals key={id} leagueId={id} request={request} onUpdated={loadSquad}/>:id&&section==='wallet'?<FantasyTransactions key={id} leagueId={id} request={request}/>:id&&section==='lineup'?<FantasyLineup key={id} leagueId={id} request={request}/>:id&&['market','offers'].includes(section)?<FantasyTrading key={id+':'+section} initialOffers={section==='offers'} leagueId={id} request={request} onChange={loadSquad}/>:id&&section!=='plantilla'?<FantasyTable key={id} leagueId={id} request={request}/>:id&&squad?.manager?<FantasySquad data={squad} leagueId={id} request={request} onSold={sold} onUpdated={loadSquad} saleNotice={saleNotice} onChooseCoach={()=>sc(true)} onReveal={()=>sr(true)}/>:null}{reveal&&squad?.manager&&<SquadReveal key={id} leagueName={leagues.find(l=>l.id===id)?.name} players={squad.players} onFinish={finish}/>} {error&&<Button secondary onPress={()=>{loadLeagues(true);loadSquad()}}>Reintentar</Button>}</View>
}
