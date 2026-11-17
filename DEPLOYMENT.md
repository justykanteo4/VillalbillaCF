# Publicación web

URL: https://villalbilla-cf.albaresfernandez.workers.dev

Versión Cloudflare: b64732a1-80c5-4fd3-9e79-1acb0fb086cd

Se ha reconstruido la web con la configuración pública de Firebase recuperada de la publicación anterior. Se conservan los secretos y la conexión D1 existentes.

Comprobaciones en producción: página inicial y service worker HTTP 200; Instagram conectado con 8 publicaciones y 8 enlaces; clasificación del primer equipo con 18 filas; goleadores de liga con 116 jugadores.

Reglas de Firestore publicadas y compiladas correctamente.

Pendiente: Firebase ha rechazado el despliegue de Cloud Functions porque el proyecto requiere el plan Blaze. No se ha cambiado la facturación. El push web también necesita la clave VAPID y el registro de dispositivos.

Panel de facturación: https://console.firebase.google.com/project/villalbillacf/usage/details
