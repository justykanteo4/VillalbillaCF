function startupArea(profile,role,notificationLink=false){
 if(notificationLink)return 'Notificaciones';
 if(profile?.status==='admin')return 'privado';
 if(profile?.status==='approved')return profile.claim?.role==='player'?'jugador':'privado';
 if(profile)return 'Usuario';
 return role==='fan'?'Noticias':'Usuario';
}
const publicAreas=['Noticias','Resultados','Clasificaciones','Goleadores','Rankings','Calendario'];
function resumeArea(profile,role,saved){const fallback=startupArea(profile,role);if(!saved)return fallback;if(publicAreas.includes(saved.area))return saved.area;if(saved.uid!==profile?.id)return fallback;if(saved.area==='privado'&&['approved','admin'].includes(profile?.status)&&profile?.claim?.role!=='player')return 'privado';if(saved.area==='jugador'&&profile?.status==='approved'&&profile.claim?.role==='player')return 'jugador';if(saved.area==='VillalbillaFantasy'&&['approved','admin'].includes(profile?.status))return saved.area;return fallback}
module.exports={startupArea,resumeArea,publicAreas};
