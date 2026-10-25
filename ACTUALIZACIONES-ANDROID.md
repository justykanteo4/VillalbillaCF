# Actualizaciones Android por Internet

Estado: preparado en código; pendiente de autorizar Firebase y Expo y de terminar la configuración nativa. No se ha distribuido el APK 0.1.10 ni publicado una actualización OTA.

La versión 0.1.9 distribuida no incluye la cabecera del canal EAS. Será necesaria una instalación inicial del APK 0.1.10 (código Android 13), con la misma firma, para habilitar el canal production. Después, los cambios compatibles en JavaScript y recursos se descargarán por Internet. Añadir o cambiar módulos nativos, permisos o la configuración nativa requiere otro APK. No incrementar expo.version para una actualización JavaScript compatible: debe conservar el runtime de la base instalada.

La app comprueba actualizaciones al arrancar mediante Expo Updates. Al volver a primer plano, también comprueba si han pasado 15 minutos. Descarga mejoras sin reiniciar ni interrumpir la edición. Se aplican al siguiente arranque; la versión instalada funciona sin conexión. Ajustes muestra el estado de la descarga.

## Configuración que falta completar

1. Autorizar Firebase con una cuenta administradora del proyecto existente villalbillacf.
2. Recuperar google-services.json de la app Android com.villalbilla.cf; si no existe, registrar esa app dentro del mismo proyecto gratuito. Comprobar la huella SHA de la firma utilizada y el proveedor Google. El archivo se conserva localmente y está ignorado por Git.
3. Guardar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID con el cliente OAuth tipo 3 del archivo. Se ha recuperado un cliente público mediante Firebase Auth y guardado en .env.local, pero hay que contrastarlo con la configuración nativa. No generar claves ficticias ni usar el appId web como appId Android.
4. Ejecutar pnpm run check:android-config antes de compilar o exportar actualizaciones. Se rechazan configuraciones de otro proyecto/paquete y clientes OAuth ausentes.
5. Autorizar Expo con la cuenta del proyecto 8aa9b217-1386-4b74-9a15-9e93d127030b (justykanteo4). Revisar el plan y las cuotas gratuitas antes de publicar. No activar facturación o planes de pago; si la cuota no permite publicar, dejar la versión instalada operativa.
6. Comprobar que Expo tenga las credenciales FCM v1 del proyecto correcto antes de afirmar que funciona la recepción push Android. Esas credenciales son privadas: permanecerán en el almacén de credenciales de Expo, nunca en Git ni en el chat. No enviar notificaciones reales sin autorización específica.
7. Crear o reutilizar el canal production y verificar su asociación a la rama EAS prevista. Compilar el APK final y verificar firma, versión, recursos Firebase, clientes Google y cabecera expo-channel-name. Probar inicio de sesión y registro push en un dispositivo voluntario.

## Publicar cambios compatibles

Con Firebase Android configurado, .env.local con los valores públicos correctos, y sesión Expo autorizada:

```sh
pnpm test
pnpm run publish:android-update --message "Descripción del cambio"
```

El script exporta Android con sus variables públicas locales y publica solamente esa exportación en el canal production. No compila en EAS Build, no publica en tiendas ni cambia la facturación. La publicación web de Cloudflare sigue siendo independiente.

## Particularidades de este entorno

HOME no está disponible para guardar sesiones CLI. El lanzador local work/eas.sh redirige exclusivamente la ruta de sesión de EAS hacia work/expo-session y utiliza directorios XDG dentro de work. No modifica credenciales ni decisiones de autenticación. Firebase CLI usa XDG_CONFIG_HOME dentro de work/firebase-config. Estos directorios y las sesiones no están en Git.

Se compiló un APK intermedio 0.1.10 para comprobar las cabeceras OTA antes de recibir las capturas de los errores. No distribuir ese archivo: aún no contiene google-services.json ni las últimas correcciones nativas. Recompilar tras completar la configuración.
