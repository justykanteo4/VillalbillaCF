const teams=require('./teams.json');
const sections=[['news','Noticias','Noticias'],['results','Resultados','Resultados'],['standings','Clasificaciones','Clasificaciones'],['scorers','Goleadores club','Goleadores'],['rankings','Ranking de jugadores','Rankings'],['goalkeepers','Ranking de porteros','Rankings'],['calendar','Calendario','Calendario'],['votes','Votaciones','Votaciones'],['goalkeeper-votes','Votación a mejor portero','Votaciones']];
const teamIds=new Set(teams.map(t=>t.id)),defaultDestination={type:'section',section:'news'};
function normalizeDestination(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 if(value.type==='section'&&sections.some(([id])=>id===value.section))return {type:'section',section:value.section};
 if(value.type==='match'&&teamIds.has(value.teamId)&&typeof value.matchId==='string'&&/^\d{1,20}$/.test(value.matchId))return {type:'match',teamId:value.teamId,matchId:value.matchId};
 return null;
}
function storedDestination(raw){try{return normalizeDestination(typeof raw==='string'?JSON.parse(raw):raw)||{...defaultDestination}}catch{return {...defaultDestination}}}
function destinationRoute(value){const d=storedDestination(value);if(d.type==='match')return {area:'Resultados',match:{teamId:d.teamId,matchId:d.matchId}};const result={area:sections.find(([id])=>id===d.section)[2]};if(d.section==='goalkeepers')result.rankingView='keepers';if(d.section==='goalkeeper-votes')result.voteCategory='goalkeeper';return result}
function destinationLabel(value){const d=storedDestination(value);return d.type==='match'?'Partido · '+teams.find(t=>t.id===d.teamId).category:sections.find(([id])=>id===d.section)[1]}
function destinationUrl(value,id){const q=new URLSearchParams({aviso:JSON.stringify(storedDestination(value))});if(typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id))q.set('notice',id);return '/?'+q.toString()}
function destinationFromUrl(raw){try{const u=new URL(raw,'https://local');const d=JSON.parse(u.searchParams.get('aviso'));return normalizeDestination(d)}catch{return null}}
module.exports={sections,defaultDestination,normalizeDestination,storedDestination,destinationRoute,destinationLabel,destinationUrl,destinationFromUrl};
