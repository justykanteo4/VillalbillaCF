const KEY='villalbilla.startup-screen.v1';
const choices=[
 {id:'last',name:'Continuar donde lo dejé'},
 {id:'Noticias',name:'Noticias'},
 {id:'Calendario',name:'Calendario'},
 {id:'Resultados',name:'Resultados'},
 {id:'VillalbillaFantasy',name:'Villalbilla Fantasy'},
 {id:'privado',name:'Mi equipo (entrenadores)'},
 {id:'jugador',name:'Mi equipo (jugadores)'}
];
const valid=new Set(choices.map(x=>x.id));
function choiceFor(value){return valid.has(value)?value:'last'}
module.exports={KEY,choices,choiceFor};
