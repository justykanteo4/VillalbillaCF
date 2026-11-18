function startupArea(profile,role,notificationLink=false){
 if(notificationLink)return 'Notificaciones';
 if(profile?.status==='admin')return 'privado';
 if(profile?.status==='approved')return profile.claim?.role==='player'?'jugador':'privado';
 if(profile)return 'Usuario';
 return role==='fan'?'Noticias':'Usuario';
}
const publicAreas=['Noticias','Resultados','Clasificaciones','Goleadores','Rankings','Calendario'];
function resumeArea(profile,role,saved,preferred='last'){const fallback=startupArea(profile,role);if(preferred!=='last'){if(publicAreas.includes(preferred))return preferred;if(preferred==='privado'&&['admin','approved'].includes(profile?.status)&&profile?.claim?.role!=='player')return 'privado';if(preferred==='jugador'&&profile?.status==='approved'&&profile?.claim?.role==='player')return 'jugador';if(preferred==='VillalbillaFantasy'&&['admin','approved'].includes(profile?.status))return 'VillalbillaFantasy';}if(!saved)return fallback;if(publicAreas.includes(saved.area))return saved.area;if(saved.uid!==profile?.id)return fallback;if(saved.area==='privado'&&['approved','admin'].includes(profile?.status)&&profile?.claim?.role!=='player')return 'privado';if(saved.area==='jugador'&&profile?.status==='approved'&&profile.claim?.role==='player')return 'jugador';if(saved.area==='VillalbillaFantasy'&&['approved','admin'].includes(profile?.status))return saved.area;return fallback}
module.exports={startupArea,resumeArea,publicAreas};
