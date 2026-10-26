function startupArea(profile,role,notificationLink=false){
 if(notificationLink)return 'Notificaciones';
 if(profile?.status==='admin')return 'privado';
 if(profile?.status==='approved')return profile.claim?.role==='player'?'jugador':'privado';
 if(profile)return 'Usuario';
 return role==='fan'?'Noticias':'Usuario';
}
module.exports={startupArea};
