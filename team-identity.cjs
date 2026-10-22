function cleanName(value){return String(value||'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()}
function isHome(match,team){if(match.homeId&&team.id)return String(match.homeId)===String(team.id);return cleanName(match.home)===cleanName(team.name)}
function opponent(match,team){return isHome(match,team)?cleanName(match.away):cleanName(match.home)}
module.exports={cleanName,isHome,opponent};
