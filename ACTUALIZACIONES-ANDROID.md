# Actualizaciones Android por Internet

Configurado y publicado en Expo, cuenta justykanteo4 con plan confirmado **Free**. Canal y rama EAS: production; plataforma Android; runtime 0.1.9. No se activó facturación, EAS Build ni planes de pago.

## Instalación inicial necesaria

[APK 0.1.9 con Internet](https://github.com/justykanteo4/VillalbillaCF/raw/refs/heads/codex/apk-0.1.9-internet/VillalbillaCF-0.1.9-internet.apk)

Instalar una vez encima de la copia actual, sin desinstalar. El APK conserva el contenido de la base 0.1.9 y el mismo certificado. Solo se modificó el manifiesto para código Android 16, canal production y espera de arranque de 3000 ms. Se verificaron todos los archivos contra la base original, metadatos y firma. La versión visible y el runtime siguen siendo 0.1.9. Cualquier APK siguiente requiere código Android mayor que 16.

La versión restaurada anterior, código 15, carece de este canal nuevo: no basta con publicar una web o una actualización para habilitarlo en esa copia. Esta instalación inicial es necesaria.

## Funcionamiento

Expo Updates busca y descarga al arrancar. Al volver al primer plano también comprueba novedades si han pasado 15 minutos. Las mejoras se aplican al siguiente arranque sin interrumpir una edición; la copia instalada sigue funcionando sin conexión. Ajustes muestra si hay una actualización descargándose o lista.

JavaScript y recursos compatibles se publican por Internet. Añadir o cambiar módulos nativos, permisos o configuración nativa requiere un APK nuevo y un runtime nuevo. No cambiar expo.version para actualizaciones JavaScript compatibles del runtime 0.1.9.

## Publicación verificada

- Actualización: 01a173ba-024c-7ecc-ab08-9522cae2a18d.
- Grupo: 4910b73a-7923-4848-a1a8-e729b380f42a.
- Canal/ramificación: production. Runtime: 0.1.9. Android.
- Se verificó el manifiesto del protocolo Expo y la descarga del bundle usando las cabeceras de assets proporcionadas en la parte extensions, igual que Expo Updates. SHA-256 del bundle correcto, 3.708.240 bytes.
- El runtime 0.1.8 recibe 204 y no recibe esta actualización incompatible.
- Pendiente de instalación y prueba en el teléfono del usuario; no afirmar que ya se ha actualizado su móvil.
- SHA-256 APK: 646b16597532e0e9f831dfe0d85733ae0449bafa1ad62c3e02271288ba4a6130; tamaño 54.137.997 bytes.

## Publicar cambios compatibles

Con sesión Expo autorizada y .env.local con los valores públicos correctos:

```sh
pnpm test
pnpm run publish:android-update --message "Descripción del cambio"
```

El script valida las variables públicas, exporta solamente Android y publica la exportación en production. La exportación OTA no exige google-services.json: reutiliza la base nativa instalada, que una actualización JavaScript no puede reconfigurar. El script usa --environment production para Expo SDK 55; el bundle se exporta previamente con sus variables públicas locales.

En este entorno concreto, HOME no está disponible y la sesión se guarda solo en work/expo-session. Usar el lanzador local:

```sh
EXPO_NO_TELEMETRY=1 pnpm run export:android-update
bash work/eas.sh update --channel production --platform android --environment production --input-dir work/ota-export --skip-bundler --non-interactive --message "Descripción del cambio"
```

La publicación web de Cloudflare es independiente. Respetar las cuotas Free. Si se agotan, conservar la copia instalada; no activar facturación ni actualizar planes automáticamente.

## Firebase/Google Android: pendiente independiente

El APK conserva la configuración nativa original de la 0.1.9. El cliente público Google recuperado sí se incluye en el JavaScript publicado y los errores técnicos se presentan como mensajes comprensibles. Eso no demuestra que la recepción push Android esté reparada.

Para una compilación nativa nueva, primero autorizar Firebase, recuperar google-services.json del proyecto existente, comprobar paquete com.villalbilla.cf y huellas SHA, y verificar que Expo tenga las credenciales FCM v1 correctas. Ejecutar pnpm run check:android-config y pnpm run prebuild:android. La comprobación nativa continúa bloqueando una compilación sin configuración válida. Credenciales privadas de FCM solo en Expo, nunca en Git ni en el chat. No enviar notificaciones reales sin autorización específica.

Una vez se cambie esa configuración nativa, usar un runtime nuevo y código Android mayor que 16. No distribuir el APK intermedio 0.1.10 anterior: era una comprobación sin Firebase Android configurado.
