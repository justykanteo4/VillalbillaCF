const teams=require('../teams.json'),{pageData}=require('./news.cjs');

async function teamStaff(id){
  const team=teams.find(item=>item.id===id);
  if(!team)return null;
  try{
    const response=await fetch('https://www.rffm.es/fichaequipo/'+team.id,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Federation unavailable');
    const data=pageData(await response.text()).team;
    return {teamId:id,people:[['tecnicos_equipo','Entrenador'],['auxiliares_equipo','Auxiliar'],['delegados_equipo','Delegado']].flatMap(([key,role])=>(data?.[key]||[]).map(person=>({name:person.nombre,role})))};
  }catch{return {teamId:id,people:[],error:true}}
}

module.exports={teamStaff};
