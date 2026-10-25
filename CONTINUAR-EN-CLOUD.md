# Villalbilla C.F. — continuar en Codex Cloud

## Estado actual prioritario: 0.1.9 con Internet
La cuenta Expo justykanteo4 ya está autorizada y se confirmó su plan Free. Se creó production y se publicó Android runtime 0.1.9: update 01a173a1-b222-739e-bd2b-9189019af54d, grupo 19272470-f305-4b5c-b43c-7cc64169f546. Se verificaron manifiesto, descarga autenticada de assets y hash del bundle; el runtime 0.1.8 no recibe la actualización.

El usuario debe instalar una vez https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.9-internet/VillalbillaCF-0.1.9-internet.apk encima de su APK, sin desinstalar. Este APK reutiliza todos los archivos de la base 0.1.9; solo se cambió el manifiesto a código Android 16, cabecera production y espera de arranque 3 s. Firma y payload comprobados contra el original. No se ha probado en su teléfono. SHA-256 646b16597532e0e9f831dfe0d85733ae0449bafa1ad62c3e02271288ba4a6130.

La rama de código queda alineada en versión 0.1.9/código 16 para publicar mejoras JavaScript compatibles. Cualquier APK posterior debe tener código mayor que 16; los cambios nativos necesitan runtime nuevo. El archivo google-services.json y las credenciales FCM siguen pendientes para corregir completamente notificaciones Android; no se ha fingido su configuración ni se ha distribuido el APK intermedio 0.1.10. Consultar ACTUALIZACIONES-ANDROID.md, actualizado con el procedimiento vigente. Las notas siguientes son el historial de esta conversación y pueden describir estados previos.

No se cambiaron planes, facturación, web, D1 o secretos de Cloudflare ni se enviaron notificaciones. La sesión Expo está solo en work/expo-session. En este entorno publicar con work/eas.sh, no con una sesión HOME inexistente.

## Objetivo y restricciones del usuario
Corregir los requisitos de la revisión y mantener la aplicación sin planes de pago. No activar Blaze, Workers Paid, servicios de pago ni publicaciones en tiendas. El usuario solicita continuar desde otro dispositivo usando Codex Cloud.

## Estado del trabajo
La primera tanda de correcciones está publicada en https://villalbilla-cf.albaresfernandez.workers.dev (versión b64732a1-80c5-4fd3-9e79-1acb0fb086cd). Las reglas de Firestore se publicaron en villalbillacf. El despliegue de Cloud Functions fue rechazado por requerir Blaze; no se cambió la facturación.

Esta rama contiene además la alternativa gratuita más reciente: avisos y suscripciones en D1, autenticación de administradores mediante ID tokens Firebase, Web Push con VAPID, envío Expo y cola procesada con Cron de Cloudflare. El archivo firebase.json ya no configura Functions. functions/index.cjs es la implementación anterior, sin uso en el despliegue actual; functions/targets.cjs se reutiliza como función pura para el filtrado.

En Cloudflare ya se creó la base D1 villalbilla-notifications, se aplicó notification-schema.sql y se guardaron WEB_PUSH_PUBLIC_KEY y WEB_PUSH_PRIVATE_KEY como secretos del Worker. Se conserva VISITS_DB y los secretos anteriores de Instagram. La alternativa gratuita se publicó el 25 de octubre de 2026 con autorización expresa del usuario, versión f9c9c5e6-eefb-48ca-8f24-515e14a9e33e. No se enviaron notificaciones a usuarios durante las pruebas.

## Validación realizada
12 pruebas en features.test.cjs y 5 en free-notifications.test.mjs pasan. Pasan también logic.test.mjs y las exportaciones Expo para web, Android e iOS. Se probó el cifrado Web Push en el runtime local real de Cloudflare sin enviar mensajes externos. wrangler deploy --dry-run compila el Worker nuevo y encuentra ambas bases D1.

## Entorno de desarrollo
Usar Node 24 para node:sqlite de los tests, pnpm y pnpm install --frozen-lockfile. Ejecutar pnpm test. Para web: pnpm exec expo export --platform web. No ejecutar ni desplegar funciones de Firebase.

## Continuación en Cloud — 25 de octubre de 2026
- Se obtuvo origin/codex/continuar-cloud-gratis y se verificó el commit inicial exacto 077899347b8540b80be42b6af49896011f1d7b4a.
- Node 24.19.0, pnpm 11.25.0; pnpm install --frozen-lockfile completado sin modificar el lockfile. La caché de pnpm se ubicó en /workspace/work porque el directorio predeterminado del entorno no estaba disponible.
- Se corrigió el límite de 1.000 suscripciones activas para que también se compruebe dentro de la escritura SQL: un recuento previo obsoleto ya no permite sobrepasarlo.
- pnpm test: 19 pruebas aprobadas (12 de funcionalidades, 7 de notificaciones) y logic.test.mjs correcto. Nuevas pruebas para el recuento obsoleto y rechazo de sesiones manipuladas. La prueba del servidor HTTP local necesita permiso de red en el sandbox.
- Se recuperaron exclusivamente los valores públicos de Firebase de la web publicada y se guardaron en .env.local, ignorado por Git, junto con EXPO_PUBLIC_API_URL. No se configuraron nuevos secretos.
- Exportación web y wrangler deploy --dry-run correctos; comprobación de rutas en runtime local correcta. No se ha probado una interacción completa en un navegador real ni en un dispositivo físico en esta sesión.
- Se autorizó Cloudflare con wrangler login --device. La sesión se conserva únicamente en work/cloudflare-config, ignorado por Git. Para comandos Wrangler de este entorno usar XDG_CONFIG_HOME=/workspace/VillalbillaCF/work/cloudflare-config y WRANGLER_LOG_PATH=/workspace/VillalbillaCF/work/cloudflare-logs; para Expo usar EXPO_NO_TELEMETRY=1 debido al directorio personal no disponible.
- Antes de publicar se consultó D1 en modo lectura: cero avisos y cola vacía. No se crearon suscripciones reales ni se enviaron notificaciones.
- pnpm run deploy:cloudflare completado. Versión f9c9c5e6-eefb-48ca-8f24-515e14a9e33e; cron cada minuto, ambas conexiones D1 conservadas. Se comprobaron los nombres de los secretos antes y después: INSTAGRAM_ACCESS_TOKEN, RESEND_API_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_PUBLIC_KEY; sin leer ni reemplazar sus valores.
- Comprobaciones en producción: /, /firebase-messaging-sw.js, /manifest.webmanifest, /api/push/key y /api/notifications devuelven 200; /api/push/send y /api/push/dispatch sin sesión devuelven 401. La clave pública está disponible. La comprobación HTTP necesita User-Agent de navegador para evitar el bloqueo 1010 del cliente Python predeterminado.
- No se activaron Blaze, Workers Paid, facturación ni recursos nuevos en producción. La API de suscripciones de facturación devolvió 403 con los permisos OAuth disponibles: no se ha podido auditar independientemente el plan completo de la cuenta. No se cambió su configuración de facturación.

## Resumen global en Noticias — 25 de octubre de 2026
- Se añadió al principio de Noticias «Resumen del club»: primero la jornada (semana de lunes a domingo en Europe/Madrid) y debajo el acumulado de la temporada 2026/27.
- Incluye todos los equipos del club, independientemente de los favoritos: goles a favor, goles en contra, amarillas y rojas. Excluye resultados pendientes y las tarjetas de rivales. Un partido entre dos equipos del club se cuenta una vez como partido y cada equipo aporta sus propios goles/tarjetas.
- Las tarjetas proceden de actas de la RFFM. Se muestra cobertura y aviso de recuento parcial; una ausencia de acta nunca se interpreta como cero tarjetas. Segunda amarilla cuenta como amarilla y expulsión.
- Nuevo endpoint público /api/club-stats?team=ID&offset=0, con páginas de 12 actas, caché de 5 minutos y dos equipos consultados simultáneamente desde la interfaz. Sin nuevos servicios, dependencias, recursos ni cambios de plan.
- pnpm test con Node 24.19.0: 23 pruebas aprobadas, más logic.test.mjs. Nuevas pruebas: acumulados local/visitante y periodo, ausencia de actas, partido entre equipos del club sin duplicados, paginación/caché y exclusión de tarjetas rivales.
- Exportación Expo web y ensayo de despliegue correctos. Chromium con Playwright: comprobada presentación móvil de 390 px y escritorio de 1365 px usando respuestas controladas para favoritos activos y actas parciales; sin errores JavaScript ni desbordamiento horizontal en móvil.
- Publicado mediante pnpm run deploy:cloudflare. Versión actual: 7c27290f-526b-406f-aca2-dd3f97004218, en https://villalbilla-cf.albaresfernandez.workers.dev.
- Comprobación real en producción: /api/club-stats?team=680163&offset=0 devuelve seis actas disponibles, incluida 5587337 con una amarilla y una roja del club, contrastada con el acta RFFM. Rutas web y notificaciones anteriores siguen respondiendo como antes (200 públicas, 401 envío/procesamiento sin sesión).
- No se enviaron avisos ni se modificaron las bases, secretos o facturación. Las cuotas gratuitas de los proveedores siguen aplicándose.

## Resumen compacto — 25 de octubre de 2026
- A petición del usuario, jornada y temporada se muestran como dos franjas compactas: cuatro métricas en una fila, cifras y textos más pequeños, menos márgenes y encabezado con fecha en la misma línea.
- Los detalles del recuento se conservan en «Cómo se calcula», desplegable. Se mantienen los avisos de datos parciales.
- Exportación web correcta y vista comprobada con Chromium/Playwright en móvil de 390 px y escritorio, sin errores JavaScript ni desbordamiento horizontal.
- Publicado y comprobado el nuevo bundle en producción. Versión vigente: bed0da21-35f2-441e-bff8-5f0db92e0543. Sin cambios de datos, recursos, notificaciones o facturación.

## APK Android 0.1.9 — 25 de octubre de 2026
- El usuario confirmó que usa el APK y que no recibía el cambio. La publicación de Cloudflare actualiza la web, no el código incluido en un APK instalado. La copia anterior de compilación tampoco contenía los nuevos módulos nativos expo-crypto y expo-notifications.
- Se incrementó app.json a versión 0.1.9, código Android 12, y se compiló localmente sin EAS Build ni servicios de pago. Se conserva el paquete com.villalbilla.cf y la firma del APK 0.1.8; permite instalar encima sin desinstalar.
- Compilación en /workspace/apk-build reutilizando SDK /workspace/android-sdk, Java 17 en /workspace/java17/jdk-17.0.16+8 y caché /workspace/gradle-home. Scripts y logs en /workspace/VillalbillaCF/work. La copia Android generada y la clave de firma NO se incluyen en Git.
- Se copió la configuración pública .env.local a la copia de compilación. Se ejecutó Expo prebuild para Android. Por el enlace simbólico de node_modules se añadió una configuración Metro únicamente en /workspace/apk-build/metro.config.js, con watchFolders hacia /workspace/VillalbillaCF y nodeModulesPaths hacia su node_modules. No añadir esta ruta absoluta a la configuración de producción del repositorio.
- Gradle assembleRelease completado para arm64-v8a y armeabi-v7a. APK de 54.024.834 bytes. Se verificaron firma idéntica al anterior, paquete, versión, resumen nuevo en el bundle y presencia de Expo Crypto/Notifications en los DEX. No se ha probado en un dispositivo físico.
- SHA-256: 90e264bbcf38e953c0a95db4a5c876ceca0fefebab7e80451719c16d0d7684ba.
- Se entrega el APK en la rama de distribución privada codex/apk-0.1.9, archivo VillalbillaCF-0.1.9.apk: https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.9/VillalbillaCF-0.1.9.apk. Requiere sesión GitHub con acceso al repositorio. La rama de código se mantiene separada y no se añadió el binario a su historial.
- Se usó esa vía porque /codex está en un sistema de archivos de solo lectura, y GitHub rechazó el adjunto de release mediante uploads.github.com con 401 pese al acceso correcto a Git/API. El borrador vacío se eliminó; no se anunció ninguna release ni se publicaron notificaciones.
- La instalación es manual. No se ha publicado EAS Update, configurado una nueva canalización OTA ni activado planes de pago, recursos nuevos de Cloudflare o envíos de notificaciones. No afirmar que futuros cambios web se recibirán automáticamente en el APK.

## OTA y errores nativos — trabajo pendiente de autorización
- El usuario solicita actualizaciones por Internet y aporta capturas: Default FirebaseApp no inicializada al activar push y ausencia de cliente web OAuth al iniciar sesión con Google.
- Se preparó 0.1.10/código Android 13 con canal production explícito, espera de arranque de 3 s, comprobaciones al volver al primer plano limitadas a 15 minutos y estado de actualización en Ajustes. No se reinicia automáticamente mientras se edita.
- Se recuperó el cliente público Google mediante Firebase Auth createAuthUri y se guardó en .env.local; el valor no está en Git. Aún falta recuperar la configuración Android real y verificar SHA/OAuth y credenciales FCM de Expo.
- Se añadió googleServicesFile en app.json, se ignoró el archivo local y se creó pnpm run check:android-config. Actualmente falla de forma intencionada porque no se ha autorizado Firebase ni recuperado google-services.json. No distribuir otro APK sin superar esa comprobación.
- Google y push nativos transforman errores internos en mensajes comprensibles. 29 pruebas aprobadas y exportación web correcta. Se verificó una compilación intermedia con canal production, pero no se distribuyó; se debe recompilar tras completar las correcciones Firebase/Google.
- Pendientes las autorizaciones solicitadas: Firebase requiere código temporal; Expo requiere el número mostrado en su página de comprobación. No se han recibido aún. No se ha publicado EAS Update, ni cambiado planes, facturación o recursos de Cloudflare, ni enviado notificaciones.
- El procedimiento y límites están en ACTUALIZACIONES-ANDROID.md. La web desplegada y el APK 0.1.9 privado anterior permanecen como estaban.

## Restauración del APK 0.1.8 solicitada por el usuario
- El usuario ha elegido volver a la 0.1.8 y conservar su configuración original de actualizaciones. La configuración nueva de OTA y la reparación de Firebase/Google quedan pausadas; no continuar con autorizaciones ni publicar 0.1.10 sin nueva indicación.
- Se confirmó en el APK original: Expo Updates habilitado, comprobación ALWAYS al abrir, URL https://u.expo.dev/8aa9b217-1386-4b74-9a15-9e93d127030b y runtime 0.1.8. No se ha comprobado recepción real de una actualización ni se han modificado las cabeceras/canales del original.
- Para instalar sobre las versiones más recientes sin desinstalar, se creó una copia de la 0.1.8 modificando únicamente android:versionCode de 11 a 14 en el manifiesto binario. No se recompiló ni sustituyó el JavaScript, recursos, configuración Expo o bibliotecas. Se alineó el ZIP y se firmó con la misma clave; certificado comprobado idéntico al original.
- Se verificó igualdad de TODOS los archivos originales salvo el valor versionCode del manifiesto y las firmas renovadas. Paquete com.villalbilla.cf, versión visible 0.1.8. El archivo original permanece intacto en /workspace/downloads/VillalbillaCF-0.1.8.apk.
- Descarga privada: https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.8-restaurada/VillalbillaCF-0.1.8-restaurada.apk. Rama de distribución independiente codex/apk-0.1.8-restaurada; no mezclar el binario en la rama de código.
- Archivo de 53.030.307 bytes. SHA-256 b5274acb42d5801b1c7694830193bae8630c8f45f55610f9b71d6836b8a5029a. Pendiente de instalar/probar en el móvil del usuario. Instalar encima, sin desinstalar.
- Cualquier APK futuro debe usar versionCode mayor que 14. La rama de código mantiene los cambios anteriores por petición de conservarlos; la app instalada restaurada corresponde al binario original 0.1.8, no al código pendiente 0.1.10.
- No se ha cambiado la web, facturación, bases D1 o secretos ni se han enviado notificaciones. Restaurar 0.1.8 no significa haber corregido su configuración original de Firebase/Google.

## Regreso a la 0.1.9 solicitado después de la restauración
- El usuario pide «Volvemos a la otra», referido a las dos versiones ofrecidas: se recupera la 0.1.9 con el resumen compacto de Noticias.
- Copia del APK 0.1.9 ya distribuido, conservando JavaScript, recursos, bibliotecas y configuración; se modifica únicamente versionCode de 12 a 15 y se vuelve a firmar con el mismo certificado para instalar sobre la restauración 0.1.8/código 14 sin desinstalar. Se verificó igualdad de todos los archivos salvo manifiesto y firmas, metadatos y certificado.
- Descarga privada: https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.9-restaurada/VillalbillaCF-0.1.9-restaurada.apk. Rama codex/apk-0.1.9-restaurada.
- Archivo de 54.137.997 bytes; SHA-256 1f10c882499ec509cfb5e3a88ef4dde745198e9af1f234f2e23c7588d58dbf6f. No se ha probado en un móvil físico. Cualquier APK posterior requiere versionCode mayor que 15.
- No se ha modificado la web ni activado la configuración pendiente de OTA/Firebase/Google. No se han cambiado planes o enviado notificaciones. Los APK anteriores y todos los cambios de código se conservan.

## Solicitud posterior: recuperar también actualizaciones por Internet
- Tras volver a la 0.1.9, el usuario vuelve a solicitar actualizaciones por Internet. Se retoma ese objetivo; el APK 0.1.9/código 15 entregado NO lleva el nuevo canal OTA ni se ha publicado una actualización EAS.
- La autorización Expo anterior había caducado. Se inició otra mediante login de dispositivo y se solicitó el número de confirmación de la página. No dar las actualizaciones por activadas hasta completar acceso, canal, publicación y verificación.
- Sigue siendo necesaria una instalación inicial con el canal configurado. Los cambios nativos seguirán necesitando APK; las mejoras JavaScript compatibles podrán descargarse por Internet. No activar planes de pago ni enviar notificaciones reales. Mantener los APK y cambios existentes.

## Próximos pasos
1. Comprobar inicio de sesión de administrador en navegador y, con consentimiento, suscripción de un dispositivo voluntario. No enviar notificaciones reales sin autorización específica.
2. Verificar recepción Web Push/Expo en dispositivo real cuando se autorice un envío. La exportación web no demuestra recepción en dispositivos físicos.
3. Vigilar cuotas globales gratuitas de Cloudflare D1/Workers y Expo. El máximo de 1.000 dispositivos y 20 avisos por 24 horas no garantiza disponibilidad bajo cualquier carga; no activar planes de pago al alcanzar cuotas.
4. Las variables públicas de Firebase y la sesión Cloudflare son locales al entorno, no se transfieren por Git. En un entorno nuevo recuperar los valores públicos desde la web vigente y volver a autenticar Cloudflare. No recrear las bases D1 ni los secretos existentes.

## Seguridad y transferencia
No se han subido .env, .dev.vars, credenciales OAuth, logs, node_modules ni sesiones de navegador. Las sesiones locales de Cloudflare y Firebase no se transfieren al nuevo entorno. No pedir al usuario que pegue claves privadas en el chat.
