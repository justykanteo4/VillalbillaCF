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

## Fantasy: identidad persistente y ventas en Mis operaciones

La comprobación /preview se guarda en AsyncStorage por usuario y contexto de estado/equipo/rol. FantasyScreen muestra esa copia mientras revalida en segundo plano al entrar, al volver y cada cinco minutos; la primera consulta sin copia requiere conexión. Una respuesta denegada invalida las copias privadas incluso tras reiniciar. Un cambio de cuenta/contexto no presenta la identidad anterior. La caché no concede permisos: todas las API conservan sus comprobaciones y cada escritura exige servidor.

fantasyRequest lee las copias locales antes de solicitar el token; comprueba la cuenta antes y después de la red para descartar resultados de una sesión cambiada. La caché privada existente conserva ligas, plantilla, mercado, búsqueda, avisos, once, clasificación y transacciones, y admite también entrenadores y directorio. Las transacciones presentan copia al montar. Las escrituras invalidan las copias financieras anteriores. No se añaden datos privados al paquete público.

Mercado → Mis operaciones incluye Ventas realizadas con foto y nombre, importe histórico cobrado, fecha/hora, destino, valor de mercado histórico cuando consta, saldo tras operación y referencia. Lee el registro de transacciones existente; no vuelve a vender ni recalcula ventas antiguas con precios actuales. Las ventas al mercado y los traspasos vendidos se identifican por su tipo; se conserva compatibilidad con copias antiguas. No incluye sueldos o premios entre las ventas.

## Fantasy: eliminar esperas encadenadas (revisión 2026.11.14.14)

Se corrigió una invalidación excesiva: cada escritura financiera borraba también la utilidad de la identidad guardada. El acceso tiene ahora su propia versión; las ventas, pujas y cambios de once invalidan los importes anteriores sin obligar a repetir la pantalla inicial. Las denegaciones 401/403 y los ajustes de acceso invalidan ambos ámbitos, también tras reiniciar. La migración parte de la versión anterior para no recuperar permisos ya invalidados.

Las copias privadas se reutilizan en memoria durante la sesión, con lecturas de almacenamiento concurrentes compartidas. Volver diez veces a una consulta reciente no añade lecturas del dispositivo ni red en la prueba. Al validar la cuenta se prepara, después de dos segundos y en segundo plano, la identidad, la lista de ligas y la primera plantilla permitida. Nunca se usa una cuenta distinta; los errores no bloquean la pantalla del club. No se anticipan escrituras.

Once, mercado, clasificación y movimientos montan sus consultas propias sin esperar al resultado de toda la plantilla. La elección de entrenador sigue mostrándose cuando se confirma que falta; las API mantienen sus requisitos. La prueba de interfaz mantiene la consulta de plantilla sin resolver y comprueba que las cuatro secciones pueden abrir. Se han verificado 387 pruebas y exportaciones web/Android antes de publicar. Las mediciones de pruebas son locales; no se atribuye una duración concreta a un móvil real.

Después de una operación financiera, la lista guardada de ligas sigue disponible para entrar, pero omite los saldos invalidados hasta recibir los importes nuevos. Una denegación invalida también esta lista.

## Mercado y clasificación: trabajo del servidor y ranking individual (2026.11.14.15)

La clasificación de la liga usa directamente su cálculo de puntos; no calcula antes precios, votaciones y estadísticas de todo el catálogo. Los avisos, presentación y listado de entrenadores tampoco necesitan cargar los precios del mercado. Las lecturas independientes de cartera, reservas, miembros y economía se ejecutan en paralelo después de comprobar pertenencia y liquidar sueldos. Precios lee en paralelo las revisiones, votos, actas y premios; gameRoute reutiliza los totales ya preparados sin volver a agregarlos. Se conservan las validaciones de cuenta, liga y operaciones.

El contador vive en FantasyMarketClock y solo actualiza su propio texto cada segundo. La prueba de interfaz deja avanzar el contador y verifica que no se vuelve a renderizar PlayerPortrait. Tras entrar en una liga se anticipan mercado y clasificación después de 1,8 segundos; las pantallas comparten las consultas en curso y las copias privadas existentes.

Clasificación añade Liga y Jugadores. El ranking individual incluye los jugadores del club, ordena los puntos Fantasy de mayor a menor y comparte puesto entre empates. Conserva el puesto general al buscar. Dibuja inicialmente 30 filas y permite cargar más. La ficha se abre con los datos recibidos, sin consulta adicional: valor vigente y estadísticas confirmadas de las actas, incluidos premios válidos; los datos incompletos se identifican como provisionales. No cambia las reglas de puntuación. Las pruebas del servidor comprueban también que otra cuenta no puede consultar el catálogo de una liga ajena.

Validación de esta revisión: 390 pruebas correctas, incluido el aislamiento de liga y los importes de ventas/pujas. Playwright comprueba la ordenación por puntos, apertura/cierre de ficha con valor y estadísticas y retorno a Liga; mientras avanza el contador, el número de renders de retratos permanece igual. Esta comprobación mide el trabajo de interfaz en el entorno de pruebas, no el tiempo real del teléfono.

## Edición administrativa de resultados y actas de una sola descarga (2026.11.14.16)

Resultados → Ver detalles muestra Modificar resultado exclusivamente a perfiles administradores. La API /api/admin/result-edits verifica el administrador vigente en cada lectura y escritura; no confía en el rol enviado desde la pantalla. Guarda marcador y revisión, y un historial privado con UID, email y nombre de la identidad autenticada, fecha, resultado anterior y acción. Las escrituras comparan revisión y enlazan la auditoría con un ID único en la misma transacción para evitar sobrescribir cambios concurrentes. Restaurar resultado oficial desactiva la corrección y conserva el historial. No se han modificado partidos reales como prueba.

La tabla result_edits publica solo marcadores, revisión y fecha; result_edit_history permanece en VISITS_DB y solo se consulta por la ruta autenticada. /api/news y /api/team-calendar aplican las correcciones después de leer la caché original, por lo que una caché de origen no restaura el marcador anterior. La identidad del editor no aparece en datos públicos ni en los recursos offline. Las revisiones permiten también eliminar una corrección antigua de los dispositivos al restaurar la fuente. Las actas y los cálculos deportivos oficiales no se alteran para inventar goles de jugadores.

report-cache-policy.cjs valida actas completas y cerradas de esquema 5 y versión vigente de porteros. Dispositivo y servidor reutilizan esas actas incluso ante refresh: no las descargan de nuevo por abrir una pantalla. El servidor conserva su copia en public_sports_cache y el dispositivo usa su copia canónica. Las actas abiertas, incompletas, con error o cálculo antiguo siguen consultándose. Fantasy deja de recorrer actas completas que ya tiene incorporadas y mantiene el reintento de las pendientes; el calendario y las nuevas jornadas continúan actualizándose.

Clasificación Fantasy incluye todos los jugadores de todas las categorías que constan en el catálogo. Se identifica el total de jugadores y cuántos se están mostrando; la presentación gradual y la búsqueda completa conservan la rapidez. Las pruebas verifican que ninguna categoría del catálogo con jugadores quede excluida.

Validación: 396 pruebas correctas y prueba de interfaz móvil para modificar, mostrar autor privado, restaurar y ocultar al retirar el rol de administrador. Ejecutar result-edits-schema.sql sobre VISITS_DB antes de publicar el Worker. Sin nuevos módulos nativos; mantener ambos runtimes Android.
