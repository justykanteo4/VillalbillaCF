// El calendario público RFFM ya se solicita para obtener los encuentros.
// Extraemos únicamente escudos presentes en esa MISMA respuesta: no visitamos
// fichas de equipos o jugadores, no inventamos URLs ni hacemos búsquedas por nombre.
const keys={
 home:['escudo_equipo_local','escudo_local','escudolocal','logo_equipo_local','logo_local','logolocal','imagen_equipo_local','imagen_local','img_equipo_local','img_local','home_crest','home_logo','home_image','homeEscudo','homeLogo'],
 away:['escudo_equipo_visitante','escudo_visitante','escudovisitante','logo_equipo_visitante','logo_visitante','logovisitante','imagen_equipo_visitante','imagen_visitante','img_equipo_visitante','img_visitante','away_crest','away_logo','away_image','awayEscudo','awayLogo']
};
function safeCrestUrl(value){
 if(value&&typeof value==='object'){
  value=value.url||value.src||value.path||value.image||value.imagen||value.escudo||value.logo||value.secure_url;
 }
 if(typeof value!=='string'||!value.trim()||value.length>1600)return null;
 let u;try{const raw=value.trim();u=new URL(raw,/^\/pnfg\/pimg\/Clubes\//i.test(raw)?'https://appweb.rffm.es':'https://www.rffm.es')}catch{return null}
 if(u.protocol!=='https:'||u.username||u.password)return null;
 const host=u.hostname.toLowerCase();
 if(!(host==='rffm.es'||host.endsWith('.rffm.es')||host==='rffm-cms.s3.eu-west-1.amazonaws.com'||host.endsWith('.cloudfront.net')))return null;
 if(!/\.(?:png|jpe?g|jfif|webp|gif|svg)(?:$|[?#])|\/_next\/image\?|\/media\/|\/images\/|\/escudos\/|\/logos\/|\/pnfg\/pimg\/Clubes\//i.test(u.pathname+u.search))return null;
 return u.href;
}
function crestFromFixture(fixture,side){
 if(!fixture||!['home','away'].includes(side))return null;
 for(const key of keys[side]){
  const result=safeCrestUrl(fixture[key]);
  if(result)return result;
 }
 const suffix=side==='home'?/(?:local|casa|home)/:/(?:visitante|fuera|away)/;
 for(const [key,value] of Object.entries(fixture)){
  if(!suffix.test(key)||!/(?:escud|logo|imagen|image|shield|crest)/i.test(key))continue;
  const result=safeCrestUrl(value);
  if(result)return result;
 }
 return null;
}
module.exports={safeCrestUrl,crestFromFixture};
