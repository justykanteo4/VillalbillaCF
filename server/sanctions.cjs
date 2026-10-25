const teams=require('../teams.json');
const {groupFixtures}=require('./news.cjs');
const {matchFixtureDetails}=require('./match.cjs');

const played=match=>match?.homeScore!==null&&match?.homeScore!==undefined&&match?.awayScore!==null&&match?.awayScore!==undefined;
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toUpperCase();
const same=(a,b)=>normalize(a)===normalize(b);
const teamName=(fixture,id)=>String(fixture.homeId)===String(id)?fixture.home:fixture.away;
function cardsForTeam(act,fixture,id){if(!act||act.error||!act.cardsAvailable)return null;const label=teamName(fixture,id);return act.cards.filter(card=>same(card.team,label)).map(card=>({...card,number:card.number==null||card.number===''?null:String(card.number),playerId:card.playerId||null,minute:card.minute||null,matchId:fixture.id,round:fixture.round,match:fixture.home+' · '+fixture.away}))}
async function addMissingNumbers(cards,teamId){if(!cards?.length)return cards;try{const response=await fetch('https://www.rffm.es/fichaequipo/'+teamId,{signal:AbortSignal.timeout(12000)});if(!response.ok)return cards;const html=await response.text(),m=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!m)return cards;const roster=JSON.parse(m[1]).props.pageProps.team?.jugadores_equipo;if(!Array.isArray(roster))return cards;return await Promise.all(cards.map(async card=>{if(card.number)return card;const row=roster.find(player=>String(player.cod_jugador)===String(card.playerId))||roster.find(player=>same(player.nombre,card.name));const number=row?.dorsal_jugador?.trim()||row?.dorsal?.trim()||null;return number?{...card,number}:card}))}catch{return cards}}
async function mapLimit(items,limit,fn){const results=new Array(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const i=cursor++;results[i]=await fn(items[i],i)}}));return results}
function currentSuspensions(fixtures,actByMatch,teamId){
 const players=new Map();let complete=true;
 for(const fixture of fixtures){
  if(!played(fixture))continue;
  for(const state of players.values()){
   const first=state.suspensions.find(item=>item.unit==='matches'&&item.remaining>0);
   if(first)first.remaining--;
  }
  const act=actByMatch.get(fixture.id);
  if(!act||act.error||!act.cardsAvailable){complete=false;continue}
  for(const card of cardsForTeam(act,fixture,teamId)||[]){
   const key=String(card.playerId||normalize(card.name));
   if(!players.has(key))players.set(key,{name:card.name,number:card.number,playerId:card.playerId,yellowCards:0,suspensions:[]});
   const state=players.get(key);if(card.color==='yellow'||card.type==='Segunda amarilla')state.yellowCards++;
   const duration=card.suspension;
   if(!duration||!Number.isInteger(duration.count)||duration.count<1)continue;
   if(duration.unit==='matches')state.suspensions.push({...duration,remaining:duration.count,round:fixture.round,matchId:fixture.id,minute:card.minute});
   else if(fixture.date&&['days','weeks','months'].includes(duration.unit)){
    const until=new Date(fixture.date+'T12:00:00Z');
    if(duration.unit==='months')until.setUTCMonth(until.getUTCMonth()+duration.count);else until.setUTCDate(until.getUTCDate()+duration.count*(duration.unit==='weeks'?7:1));
    state.suspensions.push({...duration,until:until.toISOString().slice(0,10),round:fixture.round,matchId:fixture.id,minute:card.minute});
   }
  }
 }
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'}),sanctions=[];
 for(const state of players.values())for(const item of state.suspensions){
  if(item.unit==='matches'?item.remaining<=0:item.until<today)continue;
  sanctions.push({name:state.name,number:state.number,playerId:state.playerId,yellowCards:state.yellowCards,pendingMatches:item.unit==='matches'?item.remaining:null,duration:item.text,reason:item.text+(item.unit==='matches'?' · '+item.remaining+' partido(s) pendiente(s) estimado(s)':' · hasta '+item.until+' (estimado)'),round:item.round,matchId:item.matchId,minute:item.minute,complete});
 }
 return {sanctions,yellowWarnings:[],complete};
}

async function sanctions(teamId){const team=teams.find(item=>item.id===String(teamId));if(!team)return null;try{
 const fixtures=await groupFixtures(team.id);if(!fixtures)return null;
 const ordered=fixtures.slice().sort((a,b)=>a.round-b.round||(a.date||'').localeCompare(b.date||''));
 const teamIds=[...new Set(ordered.flatMap(match=>[match.homeId,match.awayId]).filter(Boolean))];
 const byTeam=new Map(teamIds.map(id=>[id,ordered.filter(match=>match.homeId===id||match.awayId===id)]));
 const nextFor=id=>(byTeam.get(id)||[]).find(match=>!played(match)||match.homeScore===null||match.awayScore===null)||null;
 const matchesBeforeNext=id=>{const next=nextFor(id);return (byTeam.get(id)||[]).filter(match=>played(match)&&(!next||match.round<next.round)).sort((a,b)=>a.round-b.round||(a.date||'').localeCompare(b.date||''))};
 const next=nextFor(team.id),opponentId=next?(next.homeId===team.id?next.awayId:next.homeId):null;
 const opponentLast=opponentId?matchesBeforeNext(opponentId).slice(-1)[0]||null:null;
 const teamFixtures=new Map(teamIds.map(id=>[id,matchesBeforeNext(id)]));
 const required=[...new Map([...teamFixtures.values()].flat().map(match=>[match.id,match])).values()];
 const acts=await mapLimit(required,8,match=>matchFixtureDetails(team.id,match,match.homeId));
 const actByMatch=new Map(required.map((match,index)=>[match.id,acts[index]]));
 const perTeam=await Promise.all(teamIds.map(async id=>{const result=currentSuspensions(teamFixtures.get(id)||[],actByMatch,id);return {id,result}}));
 const teamLabels=new Map();for(const id of teamIds){const fixture=(byTeam.get(id)||[])[0];if(fixture)teamLabels.set(id,teamName(fixture,id))}
 const allSanctions=await Promise.all(perTeam.flatMap(({id,result})=>result.sanctions.map(async row=>({...((await addMissingNumbers([row],id))[0]),teamId:id,teamName:teamLabels.get(id)||team.name}))));
 const pending=allSanctions.filter(row=>row.teamId===team.id),opponentDismissals=opponentId?allSanctions.filter(row=>row.teamId===opponentId):[];
 const ownResult=perTeam.find(item=>item.id===team.id)?.result;
 const yellowWarnings=await addMissingNumbers(ownResult?.yellowWarnings||[],team.id);
 const ownLast=matchesBeforeNext(team.id).slice(-1)[0]||null,ownAct=ownLast?actByMatch.get(ownLast.id):null,opponentAct=opponentLast?actByMatch.get(opponentLast.id):null;
 return {teamId:team.id,competition:team.competition,group:team.group,nextMatch:next?{id:next.id,round:next.round,date:next.date,time:next.time,opponent:teamName(next,opponentId),opponentId}:null,pending,yellowWarnings,allSanctions,opponentDismissals,ownLastPlayedRound:ownLast?.round??null,opponentLastPlayedRound:opponentLast?.round??null,ownActAvailable:!ownLast||Boolean(ownAct&&!ownAct.error&&ownAct.cardsAvailable),opponentActAvailable:!opponentLast||Boolean(opponentAct&&!opponentAct.error&&opponentAct.cardsAvailable),ownTeamDataComplete:ownResult?.complete??false,opponentDataComplete:opponentId?perTeam.find(item=>item.id===opponentId)?.result.complete??false:true,allTeamsDataComplete:perTeam.every(item=>item.result.complete),updatedAt:new Date().toISOString(),error:false};
 }catch{return {teamId:team.id,nextMatch:null,pending:[],allSanctions:[],opponentDismissals:[],ownActAvailable:false,opponentActAvailable:false,allTeamsDataComplete:false,updatedAt:new Date().toISOString(),error:true}}
}

module.exports={sanctions,cardsForTeam,currentSuspensions};
