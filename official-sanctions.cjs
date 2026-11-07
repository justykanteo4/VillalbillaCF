const {explicitSuspension}=require('./sanction-duration.cjs');
const OFFICIAL_URL='https://intranet.ffmadrid.es/nfg/NPcd/NFG_ConsultaSanciones';
const entities={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',ntilde:'ñ',uuml:'ü'};
function clean(value){return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(all,key)=>{if(key[0]==='#'){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):' '}const text=entities[key.toLowerCase()];return text?(key[0]===key[0].toUpperCase()?text.toUpperCase():text):all}).replace(/\s+/g,' ').trim()}
function parseOfficialSanctions(html,team){
 if(typeof html!=='string'||/name=["']NLogin["']/i.test(html))throw Error('OFFICIAL_AUTH');
 for(const [field,value] of [['Sch_Cod_Temporada','22'],['Sch_Competicion',team.competition],['Sch_Grupo',team.group]]){const match=html.match(new RegExp(field+'\\.value\\s*=\\s*["\']?(\\d+)["\']?\\s*;'));if(!match||match[1]!==String(value))throw Error('OFFICIAL_CONTEXT')}
 if(!/name=["']BuscaNFG_SAN["']/i.test(html))throw Error('OFFICIAL_FORMAT');
 let round=null,date=null,role='player';const records=[],seen=new Set();
 for(const token of html.matchAll(/Jornada:\s*(\d+)\s*\((\d{2}\/\d{2}\/\d{4})\)|<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
  const header=token[0].match(/Jornada:\s*(\d+)\s*\((\d{2})\/(\d{2})\/(\d{4})\)/i);if(header){round=Number(header[1]);date=header[4]+'-'+header[3]+'-'+header[2]}
  if(/>\s*Técnicos,?\s*Auxiliares/i.test(token[0]))role='staff';else if(/>\s*Jugadores\s*</i.test(token[0]))role='player';
  if(!round||round>1000)continue;
  const row=token[0],club=row.match(/<a\b[^>]*href=["']\s*javascript:VerSancionesEq\((\d+)\);?["'][^>]*>([\s\S]*?)<\/a>/i),person=row.match(/<a\b[^>]*href=["']\s*javascript:VerSancionesJug\((\d+)\);?["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!club||!person)continue;const cells=[...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)],sanction=cells.find(m=>/\bfondolistadoscierre\b/i.test(m[1]));if(!sanction)continue;
  const reason=clean(sanction[2]),name=clean(person[2]),license=clean(cells[1]?.[2]);if(!name||!reason||name.length>160||reason.length>2000)continue;
  const item={teamId:club[1],teamName:clean(club[2]),playerId:person[1],name,round,date,role,license,reason,duration:explicitSuspension(reason)};
  const key=[item.teamId,item.playerId,round,reason,license].join(':');if(!seen.has(key)){seen.add(key);records.push(item)}
 }
 return {competition:String(team.competition),group:String(team.group),season:'22',records,checkedAt:new Date().toISOString(),source:OFFICIAL_URL};
}
function currentOfficialSanctions(records,fixtures,{today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Madrid'})}={}){
 const played=m=>Number.isInteger(m.homeScore)&&Number.isInteger(m.awayScore),rows=[];
 for(const item of records||[]){const d=item.duration;if(!d||d.count<1)continue;let pendingMatches=null,until=null;
  if(d.unit==='matches'){const served=fixtures.filter(m=>played(m)&&Number(m.round)>item.round&&[String(m.homeId),String(m.awayId)].includes(item.teamId)).length;pendingMatches=Math.max(0,d.count-served);if(!pendingMatches)continue}
  else{if(!item.startsOn){rows.push({...item,duration:d.text,publishedMatches:null,pendingMatches:null,until:null,number:null,source:'official',reason:item.reason+' · inicio y vigencia por comprobar'});continue}const start=new Date(item.startsOn+'T12:00:00Z');if(!Number.isFinite(start.getTime()))continue;if(d.unit==='months')start.setUTCMonth(start.getUTCMonth()+d.count);else start.setUTCDate(start.getUTCDate()+d.count*(d.unit==='weeks'?7:1));until=start.toISOString().slice(0,10);if(until<today)continue}
  rows.push({...item,duration:d.text,publishedMatches:d.unit==='matches'?d.count:null,pendingMatches,until,number:null,source:'official',reason:item.reason+(pendingMatches!==null?' · '+pendingMatches+' pendiente(s) estimado(s)':' · hasta '+until+' (estimado)')});
 }
 return rows;
}
function officialWarnings(records,teamId,active){const totals=new Map();for(const r of [...records].filter(r=>r.teamId===teamId&&r.role==='player').sort((a,b)=>a.round-b.round)){const previous=totals.get(r.playerId)||{...r,yellowCards:0};if(/^acumulaci[oó]n/i.test(r.reason))previous.yellowCards=0;else if(/^amonestaci[oó]n/i.test(r.reason))previous.yellowCards++;totals.set(r.playerId,previous)}return [...totals.values()].filter(r=>r.yellowCards>=4&&!active.some(s=>s.playerId===r.playerId&&s.teamId===teamId))}
module.exports={OFFICIAL_URL,clean,parseOfficialSanctions,currentOfficialSanctions,officialWarnings};
