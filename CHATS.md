# Chats de equipo y privados en Cloudflare

La sección Chats está en las áreas de entrenador y jugador. Cada equipo tiene un grupo y conversaciones privadas entre dos personas aprobadas del mismo equipo. Los contactos se registran al abrir la app actualizada. Los contactos antiguos pueden quedar visibles, pero se comprueba el permiso para abrir o enviar mensajes.

## Servicios y permisos

Cloudflare Durable Objects mantiene conexiones WebSocket con hibernación. D1 `villalbilla-chats` conserva contactos e historial; los mensajes no usan listeners ni escrituras de Firestore. Firebase conserva el inicio de sesión y la comprobación de perfiles aprobados/equipos. Un documento mínimo de nombre y rol por equipo sirve de prueba de permiso para consultar a un compañero sin exponer su perfil o correo. No se publican datos privados de los espacios de entrenadores.

La identidad se verifica con JWT Firebase en el servidor. Las comprobaciones de equipo tienen caché de hasta 30 segundos; cada conexión caduca a los 30 segundos y se renueva. La retirada de acceso se aplica como máximo en aproximadamente 60 segundos a las conexiones en curso; la app debe estar conectada para enterarse. No se pueden retirar remotamente copias ya leídas sin conexión. Los tickets de conexión son aleatorios, de un solo uso, caducan a los 15 segundos y no contienen el token Firebase. Al pasar la app a segundo plano se cierra el WebSocket.

El servidor fija nombre, identidad y fecha. Los envíos se serializan por sala; el identificador estable evita duplicar reintentos. Hay un máximo de 2000 caracteres y un límite de 20 mensajes por usuario y minuto. Las rutas privadas evitan la caché pública y no registran textos en diagnósticos.

## Historial y uso sin conexión

Al abrir por primera vez cada sala se recuperan hasta los últimos 500 mensajes previos de Firestore, con la sesión del usuario y respetando las reglas originales. Se copian sin duplicados a D1; los originales no se borran. Las reglas antiguas conservan lectura para migración y bloquean nuevos mensajes en Firestore. La migración no se da por terminada si falla la fuente.

La vista carga los últimos 100 mensajes y conserva hasta 500 consultados por sala y usuario en el dispositivo. La cola local se guarda antes de enviar. Los pendientes se reintentan al abrir el chat, recuperar primer plano o cada 15 segundos mientras está abierto. El historial se recupera tras reconectar para cubrir interrupciones. Un fallo de red o cuota no confirma el mensaje como enviado. Ningún mensaje de chat se incluye en la copia pública de la app.

Esta entrega incluye texto; no añade adjuntos, push de chat ni confirmaciones de lectura.

## Plan gratuito

No se activa ni requiere Workers Paid. Se usan Durable Objects SQLite y D1 incluidos en Free. La base del chat es independiente de las bases de visitas y notificaciones. Los límites gratuitos son compartidos por cuenta: Workers 100000 peticiones/día; Durable Objects 100000 peticiones/día y 13000 GB-s/día; D1 5 millones de filas leídas/día, 100000 escritas/día y 5 GB totales (500 MB por base Free). Los índices, tickets, conexiones, consultas y otras funciones consumen cuotas además de los mensajes. No se garantiza servicio ilimitado; al agotar cuota se conserva la cola local y se reintenta. No se cambia a un plan de pago automáticamente desde la app.

Referencias: https://developers.cloudflare.com/durable-objects/platform/pricing/ y https://developers.cloudflare.com/d1/platform/pricing/

## Verificación y despliegue

`npm test` verifica autenticación, privacidad, entradas, reintentos concurrentes, límite, tickets e importación. `npm run test:chat:rules` requiere Firestore Emulator en 127.0.0.1:8185, proyecto demo-villalbilla; carga las reglas actuales y borra solo datos del emulador. No usar datos reales en él.

Aplicar `chat-schema.sql` a `villalbilla-chats`, desplegar Worker con `CHAT_DB` y `CHAT_ROOMS` y migración SQLite `chat-rooms-v1`, publicar las reglas de lectura heredada y después las actualizaciones de la app. Mantener `wrangler deploy --keep-vars`. No se añaden módulos nativos.
