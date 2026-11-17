function googleLoginError(error){
 const code=String(error?.code||'');
 if(code==='auth/network-request-failed'||/NETWORK/i.test(code))return 'No se pudo conectar con Google. Comprueba tu conexión y vuelve a intentarlo.';
 if(code==='PLAY_SERVICES_NOT_AVAILABLE')return 'Actualiza los servicios de Google Play y vuelve a intentarlo.';
 if(code==='10'||code==='DEVELOPER_ERROR')return 'El acceso con Google no está disponible en esta versión. Actualiza la app o entra con correo y contraseña.';
 return 'No se pudo iniciar sesión con Google. Vuelve a intentarlo o entra con correo y contraseña.';
}
function pushRegistrationError(error){
 const message=String(error?.message||'');
 if(/FirebaseApp|initializeApp|fcm-credentials|google-services/i.test(message))return 'Esta versión no puede activar los avisos. Actualiza la app y vuelve a intentarlo. Puedes leer los avisos dentro de la app.';
 return 'No se pudieron activar los avisos. Comprueba tu conexión y vuelve a intentarlo. Puedes seguir leyéndolos dentro de la app.';
}
module.exports={googleLoginError,pushRegistrationError};
