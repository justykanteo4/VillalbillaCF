// A card alone never establishes a suspension. Accept only a published duration.
function explicitSuspension(value){
 if(typeof value!=='string')return null;
 const match=value.trim().match(/\b(\d{1,3})\s*(partidos?|jornadas?|d[ií]as?|semanas?|meses?)\b/i);
 if(!match||Number(match[1])<1)return null;
 const count=Number(match[1]),word=match[2].toLowerCase();
 return {count,unit:/^(partido|jornada)/.test(word)?'matches':/^d/.test(word)?'days':/^semana/.test(word)?'weeks':'months',text:value.trim()};
}
module.exports={explicitSuspension};
