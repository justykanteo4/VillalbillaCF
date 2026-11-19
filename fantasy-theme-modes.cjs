// Preferencias de apariencia de Fantasy, compatibles con web, Android e iOS.
// El tema automático sigue el modo del dispositivo; no guarda datos privados en Git.
const MODES=Object.freeze(['light','dark','auto']);
const DARK=Object.freeze({background:'#061426',surfaceText:'#FFF8E9',header:'#081c36',panel:'#0b2a50',border:'#d4a954',text:'#f7f7fc',muted:'#b5cde5',accent:'#f1cc7a',negative:'#ff8f9b',button:'#edc66e',buttonText:'#201824',navigation:'#081629'});
const LIGHT=Object.freeze({background:'#F8F6F2',surfaceText:'#1E2431',header:'#FFFFFF',panel:'#FFFFFF',border:'#D5D8E0',text:'#1E2431',muted:'#626C7B',accent:'#9B6410',negative:'#B32638',button:'#9B6410',buttonText:'#FFFFFF',navigation:'#FFFFFF'});
function normalizeMode(mode){return MODES.includes(mode)?mode:'auto'}
function resolvedMode(mode,systemScheme){const chosen=normalizeMode(mode);return chosen==='auto'?(systemScheme==='light'?'light':'dark'):chosen}
function palette(mode,systemScheme){return resolvedMode(mode,systemScheme)==='light'?LIGHT:DARK}
module.exports={MODES,DARK,LIGHT,normalizeMode,resolvedMode,palette};
