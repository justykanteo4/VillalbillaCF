# Correcciones de la revisión

Se ha trabajado en esta carpeta; el ZIP original no se modifica.

- Notificaciones: consentimiento inicial opcional, selección mediante equipos y jugadores favoritos, bandeja propia y envío desde Administración. Suscripciones por instalación protegidas por propietario en Firestore. Funciones para enviar mediante Expo/FCM y comprobar recibos de Expo.
- Datos locales: caché de consultas GET, recuperación ante fallo de red y visor de las últimas copias desde Ajustes. El vestuario abre desde su copia local y conserva cambios pendientes para reintentar la sincronización. La sesión aprobada puede recuperar su perfil local cuando Firestore falla por conexión.
- Instagram: hasta ocho publicaciones; álbum horizontal y enlace a cada publicación. Requiere la cuenta autorizada.
- Clasificación: goleadores de la liga debajo de la tabla, diez primeras filas y ampliación. Se conserva la pestaña del ranking conjunto del club.
- Accesos: selección de equipo y tipo de ficha desde Usuario o pulsando un equipo del club en la clasificación. Entrada al espacio correspondiente al autenticar o recibir aprobación; desaparecen los botones de entrada para cuentas aprobadas.
- Ranking: goles y tarjetas; se eliminan la consulta y la presentación de minutos en ese componente. Las fichas individuales mantienen sus datos de minutos.
- Sincronización: escucha de cambios por equipo y transacción con fusión de diferencias. Ediciones en campos distintos se conservan. En el mismo campo prevalece la última escritura confirmada. Los jugadores aprobados no pueden escribir en el vestuario de entrenadores.
- Sanciones: una roja o cinco amarillas no crean una suspensión. Solo se aceptan duraciones explícitas en el texto de sanción de la fuente (`sancion` o `descripcion_sancion`). Si la fuente no lo publica, no se muestra ninguna sanción como confirmada. Los restantes estimados no sustituyen la resolución federativa.

## Activación de servicios

1. Configurar las variables de Firebase ya presentes en `.env.example` y desplegar `firestore.rules`. Habilitar Authentication anónima para suscripciones de aficionados sin cuenta, además de los métodos de acceso existentes.
2. Instalar las dependencias de `functions/` y desplegar sus funciones con Firebase CLI (`firebase deploy --only firestore:rules,functions`). Requiere un proyecto con Cloud Functions y Cloud Scheduler habilitados y un plan compatible. El código local no realiza ese despliegue.
3. Android/iOS: configurar las credenciales FCM/APNs del proyecto EAS y generar una nueva compilación con `expo-notifications`. Probar en dispositivos físicos. No basta una actualización de JavaScript para añadir el módulo nativo.
4. Web: configurar `EXPO_PUBLIC_FIREBASE_VAPID_KEY`, servir por HTTPS y conservar `public/firebase-messaging-sw.js` en la raíz de la exportación. Si no se activa push, la bandeja de avisos sigue disponible dentro de la aplicación.
5. Instagram: configurar uno de los tokens indicados en `.env.example`. No se han introducido ni verificado credenciales de producción.

Los avisos son públicos para aficionados y no deben contener información privada. La aplicación solo publica al pulsar «Publicar y enviar aviso» como administrador; no se han enviado avisos durante las comprobaciones.

## Comprobaciones

Las 12 pruebas de `node --test features.test.cjs` cubren ediciones concurrentes de asistencia/material, migración y borrados, destinatarios, sanciones con y sin duración e Instagram. `node logic.test.mjs` conserva las pruebas anteriores de fechas y enlaces.

Las exportaciones de web, Android e iOS se han completado. Verifican la integración de los componentes, sin sustituir una prueba en dispositivos. La entrega real push, la aprobación entre dos cuentas y las reglas en un proyecto desplegado requieren una prueba con Firebase y dispositivos configurados.

Referencias de configuración: https://docs.expo.dev/push-notifications/sending-notifications/ y https://firebase.google.com/docs/firestore/manage-data/transactions
