# Comunidad y chat de equipo — implementación preparada

Añade un foro interno, comentarios y me gusta en publicaciones de Instagram y partidos, y chat privado por equipo. Se basa en `codex/continuar-cloud-gratis` (4ebee7c); no sustituye los cambios pendientes del PR #1.

## Acceso y datos

- Todos los lectores y participantes necesitan una cuenta Firebase verificada y un perfil aprobado; administradores actuales también tienen acceso. No se habilita lectura pública de las conversaciones.
- Publicaciones de Comunidad y comentarios/me gusta: nuevas tablas `social_*` en la base D1 existente `NOTIFICATIONS_DB`. Un único me gusta por usuario y conversación; actualización idempotente.
- Chat: una instancia `TeamChatRoom` con SQLite por identificador de equipo. Solo el equipo aprobado y los administradores acceden. Se verifica el JWT Firebase, su proyecto/audiencia, el estado actual del perfil y el equipo desde el servidor. El cliente no decide identidad, nombre ni permisos.
- Firebase sigue autenticando y comprobando los permisos; los mensajes y las reacciones se guardan exclusivamente en Cloudflare. Esa comprobación consume lecturas de Firestore.
- El token del chat se envía en el primer mensaje WebSocket, nunca en URL ni almacenamiento del chat. Antes de autenticar no se entrega historial. Identidad válida como máximo 5 minutos, renovada cada 4 minutos. La revocación surte efecto al renovar o caducar (máximo 5 minutos). Las sesiones caducadas no reciben difusiones.
- Texto y emojis. No incluye archivos, fotos, audio, vídeo, mensajes directos ni push de cada comentario/mensaje. No envía notificaciones a los usuarios existentes.
- Autores pueden eliminar su contenido; administradores moderan Comunidad y comentarios. Cuerpo técnico modera su chat. Incluye denuncias y revisión. No muestra correos en las conversaciones.

## Funcionamiento y límites propios

- Foro/comentarios: 20 por página. Se consultan al abrir o actualizar; sin sondeo continuo ni peticiones por cada tarjeta cerrada.
- Chat: 50 mensajes por página, WebSocket solo mientras se muestra la sala y la aplicación está activa, reconexión con espera creciente y máximo de 5 intentos. Un reintento con el mismo identificador no duplica mensajes.
- 100 acciones de Comunidad por persona/día y 5.000 globales/día (UTC). Incluye crear, reaccionar, denunciar y moderar. Los contadores se actualizan con condiciones atómicas.
- Chat: 100 acciones por persona/día y 1.000 por equipo/día (UTC), intervalo mínimo de 2 segundos entre mensajes, 100 conexiones simultáneas por equipo y 10 pendientes de autenticar. SQLite transaccional para límites.
- WebSocket Hibernation evita mantener la sala ejecutándose cuando está inactiva. Historial de chat de 90 días con limpieza por alarmas en lotes. No se guardan conversaciones privadas en AsyncStorage.
- Las cuotas de Workers, D1 y Durable Objects siguen aplicando y se comparten con los demás usos de la cuenta. Estos límites NO garantizan caber bajo cualquier carga. En Free se deben aceptar interrupciones al agotar cuotas; no activar planes de pago automáticamente. Publicaciones/comentarios se conservan hasta eliminación: controlar almacenamiento y fijar retención si crece.

## Activación pendiente

No se ha desplegado, aplicado la migración en producción ni publicado una actualización Android desde este entorno. `wrangler whoami` indica que no hay sesión. No se han cambiado facturación, secretos, usuarios ni visibilidad.

1. Conectar la cuenta Cloudflare existente y confirmar Workers Free. No crear otra cuenta o Site para suplirla.
2. Aplicar la migración aditiva antes del despliegue: `npx wrangler d1 execute NOTIFICATIONS_DB --remote --file social/schema.sql`. Las tablas de avisos permanecen intactas.
3. Recuperar la configuración pública Firebase y API vigente en `.env.local` para la exportación real. No publicar el bundle de comprobación sin configurar Firebase; los identificadores no están en Git.
4. Ejecutar pruebas y exportar: `npm test`, `EXPO_NO_TELEMETRY=1 npx expo export --platform web`, `npx wrangler deploy --dry-run`.
5. Desplegar el Worker existente con el binding `TEAM_CHAT` y la migración `social-chat-v1` de tipo `new_sqlite_classes` (compatible con Free). Conservar las bases D1, secretos y audiencia existentes. No activar Workers Paid ni Blaze.
6. Probar con cuentas reales de dos equipos: publicación/reacción, prohibición de chat ajeno, revocación y moderación. Vigilar CPU, lecturas/escrituras y volumen de tráfico. No se ha hecho una prueba de carga con 1.000 usuarios.
7. Para la APK instalada se necesita entregar una actualización JavaScript compatible de Expo o un APK nuevo. Desplegar Cloudflare por sí solo no cambia la interfaz Android. No se han añadido dependencias nativas.

## Validación realizada

- `npm test`: 40 pruebas más validación de fechas/enlaces, todas aprobadas. Las nuevas pruebas cubren permisos, separación entre partidos/equipos, paginación, suplantación, moderación, cuotas y reintentos.
- Exportación web y `wrangler deploy --dry-run` correctos.
- `npm run test:social:runtime`: prueba local con el runtime Cloudflare real (Miniflare): D1 y migración, JWT RS256 con proveedor de identidad simulado, CORS y envío entre dos WebSockets. No se usa una puerta trasera de autenticación en el código de producción.
- Exportación Android correcta (bundle Hermes). No se genera ni distribuye APK desde esta sesión.
- No se ha verificado visualmente en navegador: la herramienta de navegador del entorno falló al iniciarse. Pendiente también prueba en móvil físico y comprobación de cuotas/planes reales.
