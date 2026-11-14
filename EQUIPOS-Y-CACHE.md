# Acceso, equipos y copias deportivas

El primer acceso ofrece entrenador, jugador o hincha antes de preferencias y avisos. Firebase conserva la sesión; el dispositivo conserva la elección de hincha. Los perfiles aprobados mantienen su acceso. Entrenadores nuevos seleccionan equipo y nombre oficial, pueden añadir varios equipos y envían una sola solicitud. El administrador aprueba el conjunto indicado; elegir un nombre nunca concede permisos.

Las fichas antiguas con `claim.teamId` siguen funcionando. Las nuevas incluyen `claim.teamIds` y `claim.assignments`. Firebase autoriza los vestuarios solo de los equipos aprobados. Asistencia y material siguen en `teamWorkspaces/{teamId}`, compartidos por entrenadores de ese equipo; las transacciones combinan cambios independientes. El almacenamiento local se separa por cuenta y equipo. La sincronización necesita conexión; los cambios offline se reintentan.

El encabezado del entrenador muestra su nombre y los resultados de temporada del equipo seleccionado. Se busca su nombre completo en las plantillas oficiales del club; solo una ficha inequívoca permite mostrar también sus estadísticas como jugador. Una coincidencia no concede acceso a otro vestuario. Las coincidencias ambiguas o una consulta incompleta no se asignan automáticamente.

Resultados tiene botón de actualizar y selector de un equipo. Calendario muestra un equipo y coloca primero la jornada de la semana de Madrid; si hay descanso, la siguiente publicada, o la última al terminar. El menú privado queda: Plantilla, Asistencia, Material, Calendario, Clasificación, Alineación.

Plantilla muestra avisos disciplinarios solo si hay datos para ello, después el próximo partido desplegable con dirección, Maps, Waze y previsión. Los tres siguientes rivales se despliegan para mostrar PG, PE, PP, GF y GC. La acumulación de amarillas invita a revisar el ciclo de la competición; no equivale a una sanción confirmada. Las sanciones requieren una duración publicada.

`/api/team-calendar?team=...` descarga la temporada la primera vez. Las siguientes consultas usan `&current=1`, fusionando la jornada actual con el archivo local sin borrar partidos anteriores o futuros. Las actas históricas se descargan secuencialmente en segundo plano y se conservan una vez cerradas; las actuales siguen actualizándose. Una consulta fallida no se guarda como archivo definitivo. Actualizar acta explícitamente permite recuperar correcciones. Las sanciones y datos públicos consultados también se guardan localmente, sin almacenar permisos como datos públicos. El servidor conserva actas en la tabla existente `public_sports_cache` para reducir consultas repetidas a la federación. No se garantiza que el archivo inicial esté completo hasta que la fuente responda y la descarga termine.

Validación: `npm test`; exportaciones Expo Android/web; reglas compiladas y publicadas en Firebase; comprobación con Firestore Emulator y prueba de interfaz con Playwright. Para comprobar permisos sin producción, arrancar el emulador Firestore del proyecto demo-villalbilla en 127.0.0.1:8185 con estas reglas y ejecutar `node scripts/check-team-permissions.cjs`. El script solo usa ese emulador local; valida equipos múltiples, datos compartidos, aislamiento, perfiles antiguos, pendientes, revocados y jugadores.

No hay dependencias nativas nuevas. Conservar APK 0.1.12/código 18. Exportar y publicar OTA a production para runtimes 0.1.11 y 0.1.12 usando `VILLALBILLA_UPDATE_RUNTIME` y el procedimiento de ACTUALIZACIONES-ANDROID.md. El teléfono debe descargar la actualización y volver a abrirse para aplicarla. No se han enviado avisos reales como prueba.

## Apertura local y actualización en segundo plano (14/11/2026)

Las consultas con refresh=1 comparten la clave de almacenamiento con la consulta normal. Al actualizar un acta se presenta de inmediato su copia local mediante onUpdate y después llega la respuesta de red; no se crea un archivo separado que oculte el anterior. Las versiones concurrentes se comparan sobre la misma clave para que una respuesta anterior no pise la actualización más reciente. Los parámetros de páginas, jornada y generación se conservan: una página incremental no sustituye al historial completo.

Plantillas y rankings que escuchan onUpdate presentan los datos locales antes de esperar a las actas de porteros. Sus acumulados se completan en segundo plano y se guardan al terminar. Los consumidores que necesitan esperar una consulta completa y la preparación offline conservan su comportamiento.

En Android las copias deportivas se almacenan en archivos dentro de documentDirectory/datos-guardados, con índice y archivo anterior para recuperación, y las imágenes remotas consultadas por CachedImage en Paths.document/club-images. Persisten al cerrar y volver a abrir la app; no son archivos temporales de caché. Los datos privados mantienen sus ámbitos de cuenta/equipo y no se incluyen en el paquete público.

## Prioridad de arranque (14/11/2026, revisión 5)

El arranque ofrece una vista de resultados públicos guardados mientras se valida la sesión; nunca usa esa vista como permiso para áreas privadas. Después restaura una sección permitida y, en gestión, el equipo y la pestaña de esa cuenta. La consulta de perfil y la de administrador verificado se realizan en paralelo, esperando ambas antes de decidir el acceso.

startup-work coordina tareas tras el primer render y las interacciones. Importación pública: 1,2 segundos de tranquilidad y lotes de ocho entradas, con noticias y el equipo visible primero. Actualizaciones automáticas: después de seis segundos; la comprobación manual sigue disponible. Descarga de toda la biblioteca: después de quince segundos; el orden de equipos se vuelve a consultar entre equipos para priorizar el seleccionado. Las tareas se pausan al salir de la app y conservan el progreso.

Las pantallas que consultan a la vez un recurso público comparten la descarga inicial. Las recargas explícitas, peticiones con autenticación o cancelación y las escrituras conservan su flujo independiente. Las imágenes de noticias conservan su espacio y solo se solicitan cerca del área visible; una vez cargadas se mantienen las copias locales habituales.

## Retirar administradores

Ajustes → Administración → Administradores ofrece Retirar permisos para las cuentas añadidas, con Cancelar y Confirmar retirada. Los dos correos principales de arranque permanecen protegidos tanto en el cliente como en firestore.rules. La lista muestra esta protección aunque exista también su documento clubAdmins.

removeClubAdmin elimina el documento clubAdmins en una transacción. Si había perfiles con estado admin para ese correo, los devuelve a approved cuando conservan equipo o a unassigned cuando no lo tienen; los estados normales, las cuentas, los equipos y sus datos no se borran. watchProfile observa perfil y pertenencia a clubAdmins, y no eleva el rol por una bandera admin antigua cuando ya no existe esa pertenencia. Las API administrativas comprueban la lista en cada solicitud.

/api/access/admin-revoked permite al propio interesado, o a un administrador vigente, limpiar los dispositivos y trabajos privados de avisos tras comprobar en Firestore que el permiso realmente ha desaparecido. Mantiene activos los avisos normales del club. Los reintentos pendientes se guardan por cuenta y se revisan al regresar y cada minuto.

Antes de publicar esta función hay que desplegar firestore.rules, que permite borrar exclusivamente administradores añadidos. Validación de reglas: iniciar el emulador demo-villalbilla en 127.0.0.1:8185 y ejecutar scripts/check-admin-revocation.cjs y scripts/check-team-permissions.cjs. No retirar ningún administrador real como prueba.

Estado de la revisión 2026.11.14.11: preparada, pendiente de autenticar Firebase y publicar sus reglas antes del despliegue de la interfaz. Verificadas 379 pruebas, confirmación de retirada/cancelación con interfaz web y las reglas con el emulador local; exportaciones web y Android 0.1.11/0.1.12 completadas. No se han retirado permisos a cuentas reales.

Actualización publicada de retirada de administradores: reglas Firebase desplegadas y Worker 0ab8d6ed-dac9-4fd6-bc28-8c6e4fd686cd; OTA de producción para ambos runtimes verificados. No se han retirado administradores reales como prueba.

## Valor de plantilla en Fantasy

La cabecera junto al saldo muestra Plantilla con la suma de los valores de mercado actuales de todos los jugadores de la liga seleccionada. Se suman céntimos de millón para evitar errores de coma flotante; no incluye saldo, entrenador ni pujas pendientes. Durante la carga se muestra —, sin usar la plantilla de otra liga. Las actualizaciones habituales de plantilla, compras, ventas y precios recalculan la suma; se conserva el acceso a transacciones al pulsar Saldo. La fila se adapta a móviles estrechos. Comprobada con interfaz real a 320, 390 y 545 px.
