# Villalbilla C.F. — continuar en Codex Cloud

## Objetivo y restricciones del usuario
Corregir los requisitos de la revisión y mantener la aplicación sin planes de pago. No activar Blaze, Workers Paid, servicios de pago ni publicaciones en tiendas. El usuario solicita continuar desde otro dispositivo usando Codex Cloud.

## Estado del trabajo
La primera tanda de correcciones está publicada en https://villalbilla-cf.albaresfernandez.workers.dev (versión b64732a1-80c5-4fd3-9e79-1acb0fb086cd). Las reglas de Firestore se publicaron en villalbillacf. El despliegue de Cloud Functions fue rechazado por requerir Blaze; no se cambió la facturación.

Esta rama contiene además la alternativa gratuita más reciente: avisos y suscripciones en D1, autenticación de administradores mediante ID tokens Firebase, Web Push con VAPID, envío Expo y cola procesada con Cron de Cloudflare. El archivo firebase.json ya no configura Functions. functions/index.cjs es la implementación anterior, sin uso en el despliegue actual; functions/targets.cjs se reutiliza como función pura para el filtrado.

En Cloudflare ya se creó la base D1 villalbilla-notifications, se aplicó notification-schema.sql y se guardaron WEB_PUSH_PUBLIC_KEY y WEB_PUSH_PRIVATE_KEY como secretos del Worker. Se conserva VISITS_DB y los secretos anteriores de Instagram. La alternativa gratuita todavía NO se ha desplegado en producción. No se enviaron notificaciones a usuarios durante las pruebas.

## Validación realizada
12 pruebas en features.test.cjs y 5 en free-notifications.test.mjs pasan. Pasan también logic.test.mjs y las exportaciones Expo para web, Android e iOS. Se probó el cifrado Web Push en el runtime local real de Cloudflare sin enviar mensajes externos. wrangler deploy --dry-run compila el Worker nuevo y encuentra ambas bases D1.

## Entorno de desarrollo
Usar Node 24 para node:sqlite de los tests, pnpm y pnpm install --frozen-lockfile. Ejecutar pnpm test. Para web: pnpm exec expo export --platform web. No ejecutar ni desplegar funciones de Firebase.

## Próximos pasos
1. Revisar la alternativa gratuita, en particular límites, autenticación y funcionamiento en navegador.
2. Configurar las variables públicas de Firebase desde .env.example en el entorno cloud. No están incluidas en Git. Se pueden recuperar de la aplicación web pública actual o de la consola del proyecto.
3. Si se va a publicar, autorizar Cloudflare en el entorno cloud y usar pnpm run deploy:cloudflare. Los secretos VAPID e Instagram ya permanecen en Cloudflare; no recrearlos. Conservar las dos conexiones D1 de wrangler.jsonc y los secretos existentes.
4. Verificar en producción las rutas /api/push/key, /api/notifications, autenticación de /api/push/send y la suscripción de un dispositivo voluntario.
5. El servidor pone un máximo de 1.000 dispositivos y 20 avisos por día; se rechaza el exceso. Se conserva la bandeja dentro de la app. Las cuotas globales de los proveedores también siguen aplicando.

## Seguridad y transferencia
No se han subido .env, .dev.vars, credenciales OAuth, logs, node_modules ni sesiones de navegador. Las sesiones locales de Cloudflare y Firebase no se transfieren al nuevo entorno. No pedir al usuario que pegue claves privadas en el chat.
