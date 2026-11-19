const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const score=value=>Math.max(1,Math.min(99,Math.round(Number(value)||1)));
const metric=value=>value==null||!Number.isFinite(Number(value))?'—':String(value);
const imageTag=(data,x,y,width,height,mime='png')=>data?`<image href="data:image/${mime};base64,${data}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`:'';
function cardSvg({name='JUGADOR',number='10',position='JUG',average=70,category='VILLALBILLA C.F.',ratings={},played,goals,assists,crest='',photo='',photoMime='jpeg'}) {
 const row=(x,y,title,value)=>`<rect x="${x}" y="${y}" width="343" height="75" rx="13" fill="#103e75" stroke="#24b8ff" stroke-width="3"/><text x="${x+16}" y="${y+49}" fill="#fff" font-size="28" font-weight="900">${safe(title)}</text><text x="${x+323}" y="${y+52}" text-anchor="end" fill="#ffdc4c" font-size="49" font-weight="900">${score(value)}</text>`;
 const tile=(x,title,value)=>`<rect x="${x}" y="1135" width="236" height="138" rx="15" fill="#480c2e" stroke="#f84b69" stroke-width="4"/><text x="${x+118}" y="1182" text-anchor="middle" fill="white" font-size="25" font-weight="900">${safe(title)}</text><text x="${x+118}" y="1251" text-anchor="middle" fill="#ffdc4c" font-size="62" font-weight="900">${safe(metric(value))}</text>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="1450" viewBox="0 0 800 1450">
 <defs><linearGradient id="surface" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#300a32"/><stop offset=".39" stop-color="#a80931"/><stop offset=".5" stop-color="#112c7b"/><stop offset="1" stop-color="#030d32"/></linearGradient><linearGradient id="band"><stop stop-color="#b80a36"/><stop offset="1" stop-color="#052d7d"/></linearGradient><linearGradient id="glow" x1="0" x2="1"><stop stop-color="#ff0d6c"/><stop offset="1" stop-color="#17ceff"/></linearGradient></defs>
 <rect width="800" height="1450" fill="#080d29"/>
 <path d="M400 16 518 90 671 39 777 156 777 1280 400 1435 23 1280 23 156 129 39 282 90Z" fill="url(#surface)" stroke="url(#glow)" stroke-width="14"/>
 <path d="M400 32 521 108 668 62 752 173 752 1261 400 1402 48 1261 48 173 132 62 279 108Z" fill="none" stroke="#f9ba67" stroke-width="4"/>
 <g opacity=".5" stroke="#25b9ff"><path d="M60 605 740 225M60 660 740 310M60 704 740 400" stroke-width="5"/></g>
 <rect x="72" y="163" width="205" height="229" rx="26" fill="#400d2e" stroke="#f53c57" stroke-width="7"/>
 <text x="174" y="280" text-anchor="middle" fill="#ffdc4c" font-size="110" font-weight="900">${score(average)}</text>
 <text x="174" y="351" text-anchor="middle" fill="white" font-size="55" font-weight="900">${safe(position)}</text>
 ${imageTag(crest,520,110,190,220)}
 <text x="608" y="361" fill="white" text-anchor="middle" font-size="33" font-weight="900">VILLALBILLA C.F.</text>
 <rect x="178" y="390" width="445" height="329" rx="30" fill="#134b8b" opacity=".66"/>
 ${photo?imageTag(photo,179,399,443,310,photoMime):`<text x="400" y="555" text-anchor="middle" font-size="92" fill="#b2dff6">⚽</text>`}
 <path d="M75 716 Q400 655 725 716 V825 H75Z" fill="url(#band)" stroke="#efab63" stroke-width="8"/>
 <text x="365" y="791" text-anchor="middle" fill="white" font-size="65" font-weight="900" textLength="530" lengthAdjust="spacingAndGlyphs">${safe(String(name).toUpperCase().slice(0,22))}</text>
 <rect x="629" y="716" width="103" height="107" rx="15" fill="#ba092b" stroke="#ffc478" stroke-width="6"/>
 <text x="680" y="792" text-anchor="middle" fill="white" font-size="79" font-weight="900">${safe(number)}</text>
 ${row(58,855,'VELOCIDAD',ratings.velocidad)}${row(58,945,'REGATE',ratings.regate)}${row(58,1035,'TIRO',ratings.tiro)}
 ${row(406,855,'PASE',ratings.pase)}${row(406,945,'DEFENSA',ratings.defensa)}${row(406,1035,'FÍSICO',ratings.fisico)}
 ${tile(38,'PARTIDOS',played)}${tile(282,'GOLES',goals)}${tile(526,'ASISTENCIAS',assists)}
 <path d="M215 1294 H585 L638 1352 585 1405 H215 L162 1352Z" fill="#092455" stroke="#ffca78" stroke-width="7"/>
 <text x="400" y="1350" fill="white" text-anchor="middle" font-size="38" font-weight="900" textLength="370" lengthAdjust="spacingAndGlyphs">${safe(String(category).toUpperCase().slice(0,36))}</text>
 <text x="400" y="1385" fill="#c9e6ff" font-size="24" font-weight="800" text-anchor="middle">TEMPORADA 2026/27</text>
 </svg>`;
}
module.exports={cardSvg};
