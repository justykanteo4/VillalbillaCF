const MEDALS=Object.freeze([
 {id:'primer-paso',stars:1,icon:'⚽',title:'Primer gol',description:'Has conseguido tu primera estrella'},
 {id:'aprendiz',stars:5,icon:'🥉',title:'Aprendiz del club',description:'Cinco estrellas por jugar y aprender'},
 {id:'equipo',stars:15,icon:'🤝',title:'Espíritu de equipo',description:'Quince estrellas en los juegos'},
 {id:'crack',stars:30,icon:'🥈',title:'Crack del Villalbilla',description:'Treinta estrellas de práctica'},
 {id:'leyenda',stars:60,icon:'🏆',title:'Leyenda KIDS',description:'Sesenta estrellas jugando limpio'}
]);
function sanitizeStars(value){
 const number=Number(value);
 return Number.isFinite(number)?Math.max(0,Math.min(9999,Math.floor(number))):0;
}
function medalsFor(value){const stars=sanitizeStars(value);return MEDALS.map(medal=>({...medal,unlocked:stars>=medal.stars}))}
module.exports={MEDALS,sanitizeStars,medalsFor};
