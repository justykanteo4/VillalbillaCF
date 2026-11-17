# Villalbilla C.F.

Aplicación Expo para Android, iOS y web. La actualización completa está guardada en la rama `codex/continuar-cloud-gratis`, preparada para su revisión e integración en `main`.

- [Código actualizado](https://github.com/justykanteo4/VillalbillaCF/tree/codex/continuar-cloud-gratis)
- [Web publicada](https://villalbilla-cf.albaresfernandez.workers.dev)
- [APK Android 0.1.9 con actualizaciones por Internet](https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.9-internet/VillalbillaCF-0.1.9-internet.apk)
- [Estado completo para continuar en Codex Cloud](CONTINUAR-EN-CLOUD.md)
- [Actualizaciones Android: configuración y publicación](ACTUALIZACIONES-ANDROID.md)

El repositorio y los APK alojados en sus ramas son privados. Para descargar el APK se necesita una cuenta GitHub con acceso. Instalar encima de la app anterior, sin desinstalar, conserva sus datos cuando coincide la firma.

## Funciones actuales

Noticias incluye Instagram, resultados de los 17 equipos del club y un resumen compacto de goles y tarjetas de la jornada y la temporada. Las actas abiertas se actualizan cada minuto, al volver al primer plano y mediante «Actualizar acta». Marcador, resumen, goles y tarjetas reflejan los datos recibidos de la RFFM. Si falla la consulta, se conservan los últimos datos disponibles y se indica el error.

Incluye clasificaciones, goleadores, calendario, plantillas, favoritos, asistencia, material y espacios de equipo. Las estadísticas respetan la visibilidad de la fuente federativa. Los datos ausentes se indican como no disponibles. Las categorías con calendarios por fases requieren revisar `teams.json` al cambiar de fase o temporada.

La autenticación de producción utiliza Firebase. Los administradores aprueban el acceso de entrenadores y jugadores a sus equipos. Los espacios compartidos usan Firestore y conservan cambios simultáneos. Las copias locales permiten seguir consultando datos disponibles sin conexión.

Los avisos usan Cloudflare D1, Web Push y Expo, con límites de 1.000 dispositivos y 20 avisos por 24 horas. Los secretos VAPID e Instagram permanecen en Cloudflare. La configuración nativa de Firebase/FCM y la comprobación de Google en un dispositivo Android siguen pendientes; consultar el estado completo antes de distribuir una compilación nativa nueva.

## Desarrollo desde otro dispositivo

Usar Node 24 y pnpm:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm exec expo export --platform web
```

Crear `.env.local` a partir de `.env.example` y completar los valores públicos de Firebase, Google y `EXPO_PUBLIC_API_URL` según el entorno. Las sesiones y configuraciones locales se preparan de nuevo en otro entorno y no se transfieren mediante Git. Nunca pegar claves privadas, contraseñas o tokens en el código ni en el chat.

Para desarrollo interactivo, ejecutar `pnpm start`. El servidor Node de `server/` se conserva como alternativa local y tiene sus propios requisitos de configuración. La producción actual utiliza el Worker Cloudflare y Firebase.

## Publicación

Web:

```sh
pnpm run deploy:cloudflare
```

Android, cambios compatibles con la base instalada 0.1.9:

```sh
pnpm run publish:android-update --message "Descripción del cambio"
```

El APK enlazado habilita el canal `production`. Las mejoras compatibles se descargan por Internet y se aplican en un siguiente arranque. Los cambios de módulos, permisos o configuración nativa requieren un APK y un runtime nuevos. Cualquier APK siguiente debe usar código Android mayor que 16. Para compilar desde cero, completar Firebase Android y ejecutar `pnpm run check:android-config`.

En Codex Cloud se usan rutas locales específicas para las sesiones CLI. Seguir `ACTUALIZACIONES-ANDROID.md` y `CONTINUAR-EN-CLOUD.md` para publicar desde ese entorno.

## Planes gratuitos y configuración privada

Mantener exclusivamente planes gratuitos. No activar Blaze, Workers Paid, facturación, servicios de pago ni publicación en tiendas. Las cuotas de los proveedores siguen aplicándose; no actualizar planes automáticamente cuando se alcancen.

Se conservan las dos conexiones D1 existentes y sus secretos. `.env`, `.env.local`, `.dev.vars`, `google-services.json`, claves de firma, sesiones, registros y `node_modules` permanecen fuera de Git. No ejecutar ni desplegar las antiguas Cloud Functions de Firebase.

Los APK se mantienen en ramas de distribución separadas, incluido `codex/apk-0.1.9-internet`. Las restauraciones anteriores siguen disponibles en sus ramas. El historial de cambios, verificaciones, versiones publicadas y tareas pendientes está en `CONTINUAR-EN-CLOUD.md`.
