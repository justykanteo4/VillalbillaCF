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

## MVP desde los resultados de Noticias (2026.11.14.17)

Ver detalles de un partido ganado por el equipo del club muestra Elegir MVP · Administración exclusivamente a administradores. La ventana consulta solo al abrir, enseña fotografías de los participantes confirmados de la victoria, limita a tres seleccionados y exige los tres para guardar. Carga los premios ya elegidos para poder revisarlos. Si el acta todavía no está incorporada a Fantasy, explica que la selección estará disponible al incorporarla; no inventa participaciones ni permite premiar empates/derrotas.

Reutiliza /api/fantasy/admin/awards y fantasy_awards: no existe una segunda puntuación ni otro registro de MVP. La consulta admite team y match, valida los identificadores y devuelve únicamente ese partido y sus premios, conservando el GET completo para Ajustes Fantasy. Los POST siguen comprobando administrador vigente, tres IDs distintos que jugaron y ganaron y revisión actual. Cada MVP suma el +1 configurado; el once ideal añade el otro +1 y conserva sus reglas. La misma revisión impide que dos administradores pisen cambios. Guardar de nuevo no duplica premios. El acceso administrativo funciona aunque Fantasy esté cerrada al resto de usuarios.

Validación: 397 pruebas correctas. La prueba de interfaz móvil comprueba que no se consulta hasta abrir, guardar queda deshabilitado con dos jugadores, no admite un cuarto, persiste los IDs del partido correcto y oculta el acceso a usuarios normales y en empates. No se han concedido MVP reales ni enviado notificaciones como prueba. Sin migración de base de datos ni módulos nativos nuevos.

## Ligas existentes que faltaban en web (2026.11.14.18)

Se comprobó en lectura que la liga oficial de Aficionado existe y que el mapa fantasy_official_leagues conserva su ID original. La pantalla solo enumeraba fantasy_members: una cuenta elegible que todavía no era miembro recibía una lista vacía y no tenía una opción para entrar.

GET /api/fantasy/leagues mantiene leagues para las inscripciones propias y añade availableLeagues con las ligas oficiales ya creadas de los equipos confirmados por actas, excluyendo las propias. Devuelve ID, nombre, equipo y plazas; no devuelve códigos, identidades ni datos de otras plantillas. La pantalla muestra Ligas de tu equipo con Unirme. Solo al pulsarlo se usa /team-league con el ID original; se conserva el registro oficial y no se crea una liga sustituta si el ID está desactualizado. Los límites, cierre administrativo y comprobaciones de compañeros se mantienen en el servidor.

Una cuenta ya inscrita conserva su acceso directo y su fecha de entrada, saldo, plantilla y puntuación. No se han añadido miembros reales durante las pruebas. Crear nueva liga continúa deshabilitado. La lista muestra la copia local y revalida en segundo plano en cada entrada para que una copia reciente antigua no oculte la liga disponible.

Validación: 400 pruebas correctas. Pruebas de servidor para descubrimiento de la liga heredada, entrada idempotente sin duplicados, conservación de saldo y antigüedad, restricciones de equipo/cierre y rechazo de una liga obsoleta sin crear otra. La prueba en navegador de escritorio muestra una cuenta elegible no inscrita, verifica que no hay POST hasta pulsar Unirme y que después abre exactamente el mismo ID de liga. Sin migración, nuevos permisos de Firebase ni módulos nativos.

## Resumen del mercado y tarjeta de fichaje (2026.11.15.1)

Mercado muestra Resumen del mercado con los fichajes, traspasos y ventas completados de la liga, nombres de equipos, jugador/foto, importe histórico y fecha. Toda la liga y Mis movimientos comparten la misma fuente. El historial une fantasy_trades con fantasy_player_sales; no publica reservas, ofertas pendientes, pujas perdedoras, UID, saldos ni movimientos de otras ligas. La ruta /leagues/:id/market-history comprueba pertenencia y equipo, y evita calcular precios o consultar actas. Pagina por fecha e ID (20 por consulta), presenta inicialmente tres movimientos y permite cargar más; la copia se guarda por cuenta/liga/filtro y se muestra antes de la red. El contador del mercado conserva su posición superior.

Al entrar en Fantasy se consulta en segundo plano /purchase-receipts. Muestra una tarjeta para un fichaje comprado por esa cuenta, todavía en su plantilla y pendiente de ver: foto, liga, estadísticas/puntos actuales, precio pagado en el momento de la adjudicación y valor actual separado. Puja ganadora se usa solo si consta la adjudicación en fantasy_auction_wins; una compra directa se identifica por su precio. La entrega inicial gratuita no se presenta como una compra y los jugadores ya vendidos no generan esa tarjeta.

Visto escribe un reconocimiento idempotente por usuario y trade en fantasy_purchase_seen, sin modificar dinero, plantilla, pujas ni puntuación. El servidor comprueba comprador, liga y equipo. Persiste entre dispositivos y ofrece el siguiente fichaje pendiente, si existe. Ver en mi plantilla abre la liga correspondiente. La consulta no bloquea la entrada a Fantasy. Marcar Visto no invalida la caché financiera.

Desplegar fantasy-purchase-receipts-schema.sql en CHAT_DB antes de publicar. Añade solo el registro de vistos y un índice de lectura por comprador/fecha; no crea fichajes, cobros ni notificaciones. Validación: 405 pruebas correctas, incluida una adjudicación real en SQLite con lectura de su precio/estadísticas, aislamiento del comprador y reconocimiento repetido sin cobros extra; paginación del historial con fechas iguales y aislamiento de liga. Playwright verifica la tarjeta, abrir plantilla, Visto y el filtro de operaciones propias/ajenas. No se han realizado compras, pujas ni avisos reales como prueba.

## Ventas separadas, 16 anuncios normales y navegación de mercado (2026.11.15.2)

La última aclaración del usuario mantiene hasta 16 anuncios normales y añade los vendidos en Ventas sin tocar esos 16: el total visible puede superarlos. La plantilla personal conserva sus límites anteriores. Los anuncios naturales siguen entrando de dos en dos por día; no se llenan automáticamente 16 de golpe.

fantasy-resale-schema.sql registra un anuncio resale-<sale_id> en la misma transacción de la venta. Un segundo disparador enlaza el anuncio con su venta y fija listed_at y expires_at a siete días exactos. Si falla el abono, se revierten también el anuncio y su registro; reintentar una venta no crea otro. No se cambia el importe cobrado, ni se vuelven a pagar fichajes o premios. La sección Ventas admite pujas con las reglas habituales, fotos y fecha de fin. Compra anticipada retira el anuncio; el vencimiento retira la venta y no permite nuevas pujas. El último cierre se limita a la caducidad exacta, aunque sea antes de las 23:59, y las pujas válidas de ese cierre se liquidan normalmente.

refreshMarket excluye los vendidos del cupo normal, del recorte de catálogo y de la caducidad por día de los anuncios ordinarios. La búsqueda, subastas y avisos de favoritos usan también la vigencia exacta del vendido. La política normal sube a versión 3 para migrar el máximo anterior sin reiniciar anuncios ni pujas.

Al abrir Mercado se presenta el resumen en una ventana emergente, cerrable sin esperar la carga y accesible de nuevo con Ver resumen del mercado. Mis operaciones tiene Transacciones (toda la liga y Mis movimientos) y Ofertas. Mis pujas abre una ficha con foto, importe de esa puja, valor actual, puntos y estadísticas. La consulta de estadísticas solo se repite si no estaba ya cargado el jugador. Se evita mantener montado el resumen emergente cuando está cerrado.

Validación: 408 pruebas, incluida venta con 16 normales y una puja activa conservada, anuncio adicional único, caducidad exacta tras siete días y adjudicación del último tramo. Prueba móvil de resumen emergente, Transacciones propias/ajenas, 16 normales + Ventas y ficha de Mis pujas. No se han vendido jugadores ni puesto pujas reales como prueba. Publicar la tabla de reventas antes del Worker y activar el disparador tras desplegar la nueva política para no exponer ventas a la política antigua de ocho anuncios.

### Mercado completo y TOP semanal — 2026.11.15.3

El mercado normal se rellena hasta 16 anuncios disponibles al abrirlo y en la tarea programada. Las compras y caducidades se reponen con jugadores sin TOP; Ventas sigue siendo independiente. Se reservan los porteros necesarios para los participantes pendientes de plantilla inicial. Si quedan menos candidatos libres, se publican los disponibles sin duplicar jugadores.

Una tabla `fantasy_market_top_weeks` registra el anuncio TOP publicado en cada semana de Madrid (lunes a domingo), aunque después sea comprado o caduque. La primera actualización reconoce los anuncios TOP normales publicados esa semana. Si hace falta un hueco para el nuevo TOP, se retira un anuncio normal antiguo sin pujas activas. Los anuncios de Ventas y las pujas activas se conservan. La ausencia de TOP libre permite reintentar más tarde. Las reposiciones y el registro semanal se ejecutan en un lote atómico; no reinician saldos, plantillas ni transacciones.

Migración: ejecutar `fantasy-resale-schema.sql` (idempotente) antes del Worker; solo añade la tabla semanal. Política de mercado 4 permite que las ligas existentes se rellenen sin esperar al día siguiente. Pruebas: 410 correctas, incluyendo relleno de huecos, idempotencia semanal, cambio de semana con mercado lleno y adjudicación pendiente.

### Tareas de administración y capitán en el campo — 2026.11.15.4

Los administradores tienen acceso a Tareas pendientes desde las cabeceras pública y de gestión. Se ofrecen los marcadores 1–0, 0–1 y 1–1 sin revisión manual y las victorias sin tres MVP. El aviso automático solo aparece en Noticias; posponer conserva la tarea y permite recordarla al volver a entrar o reactivar la aplicación. Guardar el marcador (también si se confirma el mismo) conserva el historial privado existente y resuelve la revisión. La corrección se propaga a Noticias y a la copia pública local; restaurar la fuente vuelve a requerir revisión si corresponde.

`GET /api/admin/match-task-status` verifica al administrador en el servidor y devuelve recuentos de MVP por equipo y partido y el estado de las revisiones de resultado, sin identidades, sin consultar actas ni descargar plantillas. Errores de esa consulta se muestran en el panel; no se presenta un cero de pendientes como si la comprobación hubiera tenido éxito. El editor de resultado y el selector de MVP mantienen sus comprobaciones y revisiones simultáneas. Las actas pendientes siguen impidiendo premios sin participación confirmada.

En Fantasy se elimina la lista de botones de capitán. Pulsando un jugador alineado se puede nombrarlo capitán desde su selector; se ve su nombre y la C en el campo. Sigue bloqueado repetir antes de seis jornadas, y el servidor valida capitán, once y cierre como antes. Sustituir al capitán por un suplente deja pendiente elegir otro. Se mantiene Guardar once y capitán.

Validación: 413 pruebas y comprobación móvil con datos simulados de aviso, posponer, reapertura, corrección, tres MVP, permisos y elección/bloqueo de capitán. Sin modificar votos, actas, premios o resultados reales como prueba.

### Pujas sin cupo y saldo indisponible — 2026.11.15.5

Las pujas solo reservan dinero: no consumen ni reservan plazas de plantilla o fichajes semanales. El guard de inserción mantiene el cierre, el mínimo y el saldo disponible en céntimos, excluyendo el importe anterior al actualizar una misma puja. Se conserva la reserva de cada puja activa hasta que se retire o se resuelva; no se abona o descuenta dinero real al pujar. En la cabecera se muestran saldo disponible, importe indisponible por pujas y valor de plantilla. Pulsar la reserva abre los movimientos.

Las adjudicaciones siguen comprobando 16 jugadores y los fichajes semanales realmente realizados; las otras pujas pendientes no bloquean una adjudicación válida. Si al cerrar un participante no cumple esos límites, se intenta el siguiente postor válido, sin cobrar al descartado. Las ofertas entre participantes también respetan el saldo reservado y las compras reales, pero no reservan huecos para las pujas.

Migración idempotente: ejecutar `fantasy-auction-schema.sql` para sustituir el guard de pujas y el guard de compras. Mantiene rondas, pujas, reservas, saldos e historial existentes. No requiere módulos nativos. Validación: 416 pruebas, incluyendo seis pujas simultáneas, actualización/cancelación exacta, dos solicitudes concurrentes sobre el mismo saldo, migración con reservas activas y liquidación sin superar 16 jugadores o dos compras semanales. Cabecera comprobada a 360 px con 22 M disponibles y 30 M indisponibles, sin desbordamiento. Sin pujas o transacciones reales de prueba.

### MVP convocados, descartes, once tardío y posiciones compartidas — 2026.11.15.6

Los tres MVP pueden elegirse entre todos los convocados reales de una victoria, incluidos suplentes sin minutos. El servidor valida acta, equipo y tres identificadores reales de esa convocatoria. El punto MVP y el adicional del once ideal se reconocen aunque no haya minutos; los demás puntos de participación siguen sus reglas. En la liga Fantasy solo suma lo aportado por los once alineados y el capitán duplica sus puntos. La plantilla restante no puntúa para el equipo Fantasy.

La jornada actual permite guardar su once después de la fecha de referencia y las alineaciones ya guardadas fuera de plazo también puntúan en las ligas existentes. Se conservan propiedad de los jugadores, once distintos, capitán y rotación de seis jornadas. El cálculo de clasificación deja de descartar un once por la hora de guardado. Una revisión de política fuerza a recalcular los premios históricos por diferencias; no reinicia saldos ni paga dos veces el mismo premio.

Tareas pendientes incorpora Descartar con confirmación y cancelación. Los descartes compartidos persisten en VISITS_DB, vinculados al tipo, equipo, partido y marcador. Si cambia el marcador vuelve a aparecer la tarea. No modifica resultados ni concede MVP. El servidor verifica administrador, origen y datos; el autor queda privado. Un fallo no elimina la tarea de la interfaz.

Las posiciones manuales de entrenadores se envían a CHAT_DB con el identificador federativo, posición y fecha de edición. Se verifica el permiso del entrenador para el equipo y el jugador en plantilla o refuerzos confirmados; se reutiliza la comprobación de permisos de ajustes de porteros. No se envía el resto del espacio privado del equipo. Las posiciones previas se importan al abrir ese equipo; las ediciones nuevas se comparten automáticamente. Una copia antigua no sustituye una edición con fecha posterior. El campo vacío vuelve a la posición federativa. Fantasy aplica esa posición a todos los participantes y la muestra en plantilla, mercado y selección del once. Si no se puede sincronizar, se informa y se reintenta al volver a primer plano.

Si falta saldo para la puja mínima o el importe introducido, Mercado abre un aviso antes de enviar. Al modificar se reutiliza su reserva anterior. Si los fondos cambian entretanto, el rechazo del servidor también abre el aviso. El servidor sigue siendo la autoridad sobre saldo y reservas.

Despliegue: `admin-match-task-dismissals-schema.sql` en villalbilla-visits y `fantasy-player-positions-schema.sql` en villalbilla-chats antes del Worker. Tras publicarlo, invalidar únicamente el estado de cálculo de premios (`next_at=0,fingerprint=NULL`) para adelantar la revisión. Pruebas: 424 correctas y pantalla móvil para suplentes sin minutos, descarte confirmado/cancelado, solo once tardío, posiciones por usuario y aviso de saldo/reserva anterior. Sin resultados, premios, posiciones o pujas reales como prueba.

Las actas consultadas por `/api/match`, tanto desde caché del servidor como recién descargadas, se incorporan en segundo plano a Fantasy al estar cerradas y tener una jornada identificada. Se reutiliza la misma transformación de actas, sin peticiones federativas adicionales ni sumar dos veces un partido. Las actas completas ya incorporadas se conservan. El cron revisa pendientes recientes cada minuto, con máximo cuatro consultas por pasada y reparto entre pendientes; las antiguas mantienen su retroceso de reintentos. Noticias conserva su caché normal en lugar de forzar la fuente en cada pasada.

Los puntos base de los once se calculan al incorporarse cada acta, independientemente de los premios semanales o de los MVP pendientes. Clasificación y ranking se actualizan cada minuto mientras están abiertos y al volver a primer plano; no descargan de nuevo las actas para mostrar los puntos. Los bonos MVP y once ideal se añaden al confirmarse. Los premios económicos continúan su cierre y confirmación de jornada, con recálculo por diferencias.

### Reparación de onces desplazados y posiciones antiguas — 2026.11.15.7

La clasificación no sumaba los jugadores porque el selector antiguo, al superar la fecha de referencia, había guardado los onces en la semana siguiente. Retirar el control de hora no recuperaba esos registros. `fantasy-lineup-recovery-2026-11-15.sql` copia a la semana del 9 de noviembre únicamente los onces completos de la semana siguiente guardados antes de la corrección 2026.11.15.6. Conserva el once futuro y sus fechas, copia la formación, no sustituye un once actual y deja una auditoría privada en `fantasy_lineup_recoveries`. Es idempotente y solicita recálculo de premios por diferencias. La recuperación real de seis onces se verificó con una copia privada de lectura y el mismo cálculo de clasificación del servidor; no se simularon jugadores, actas o goles. La pantalla del once identifica ahora su jornada explícitamente.

En la sincronización de posiciones, una entrada antigua de un jugador fuera del catálogo hacía fallar todo el lote. Las entradas numéricas fuera de la plantilla/refuerzos conocidos se omiten sin modificar otros jugadores; las posiciones válidas sí se guardan. La respuesta distingue aceptadas y omitidas. Se mantiene la comprobación de equipo, tipos, posiciones permitidas, fechas y autorización. Datos malformados siguen rechazándose. El aviso se limpia al cambiar a un equipo ya sincronizado. Se importaron las posiciones válidas existentes desde el espacio verificado de Primera Aficionado, preservando cualquier corrección compartida anterior. La copia y el SQL con esos datos son privados y no se incluyen en Git ni en la app.

Validación: 426 pruebas, incluida recuperación idempotente con puntos, futuro intacto y protección de un once actual editado, más lote mixto de posiciones válidas/antiguas sin ampliar permisos. Publicación conserva runtimes Android 0.1.11/0.1.12 y las copias deportivas anteriores.

### Posición visible en Fantasy — 2026.11.15.8

`FantasyPlayerPosition` muestra la posición ya resuelta por el servidor, con prioridad a la edición compartida del entrenador. Se reutiliza en plantilla y presentación, mercado/búsqueda, Mis pujas y su ficha, ranking y estadísticas, confirmación de venta y presentación de fichaje. En el campo del once usa POR/DEF/MED/DEL y en la selección muestra el nombre completo. Sin posición publicada no se asigna una por suposición. La etiqueta accesible identifica las posiciones manuales sin añadir peticiones ni consultas de actas.

Validación: 426 pruebas existentes y pantalla móvil de 360 px con posición manual en ranking, ficha, campo y selector, posición desconocida y ausencia de desbordamiento. No cambia las reglas de alineación, las estadísticas, las posiciones almacenadas ni los permisos.

### Puntos en las fotos y cambio de jornada el lunes — 2026.11.15.9

El once consulta `lineupPoints` calculado en el servidor para la semana y los once guardados, sin usar el acumulado de temporada. Cada foto muestra su aportación, ya con el doble del capitán, negativos, MVP y once ideal. El cálculo por partido es compartido con la clasificación para evitar diferencias; el entrenador se mantiene aparte. Un convocado sin minutos puede aportar su MVP y un jugador fuera del once no aparece en la suma. Las actas pendientes muestran «—» y los datos parciales se señalan con asterisco. Los cambios aún sin guardar no se muestran como puntos ganados.

La semana sigue el lunes a las 00:00 de Europe/Madrid. El servidor devuelve el instante de la siguiente semana y rechaza anticipar `next=1`. El cliente conserva la jornada actual hasta el lunes y cambia automáticamente de semana, también al volver de segundo plano. No copia el once anterior a una semana nueva ni borra históricos o futuros ya guardados. Mantiene la edición fuera de plazo de la jornada actual, las formaciones, la propiedad de los jugadores y la rotación del capitán. La recuperación histórica anterior se sigue probando con registros legados insertados en la prueba, sin reabrir la preparación anticipada en la API.

Se refrescan los puntos cada minuto sin volver a pedir actas. Mientras se edita, el refresco conserva el borrador y su revisión original para que no se sobrescriba una modificación de otro dispositivo sin detectarla. El cambio de semana descarta el borrador de la anterior e informa de la nueva jornada.

Validación: 427 pruebas; suma por foto igual a la clasificación para el once, capitanía y bonos, varios partidos, penalizaciones, exclusión de suplentes Fantasy y salto del domingo al lunes a medianoche de Madrid. Pantalla de 360 px: fotos con +14/-4, pendientes, cambio de capitán a -8, protección frente a cambios de otro dispositivo y cambio automático de semana sin arrastrar puntos. No requiere módulos nativos ni modifica datos de las ligas como prueba.

### Carrusel de patrocinadores — 2026.11.15.10

Al final de Noticias, después del contador, se incluye `SponsorCarousel` con los 18 archivos aportados (14 JPG y cuatro PDF de una página). Los originales permanecen fuera del repositorio; los recursos publicados están en `assets/sponsors`. Se prepararon PNG transparentes, se enderezó Elmak y se aclararon las letras oscuras para el fondo de la app, conservando los motivos y nombres. Se revisaron visualmente todos los logotipos y se corrigieron los parches de fondo residuales de ArraFer y Trak y el diseño de Carnicerías Rey antes de publicar.

Todas las diapositivas usan el mismo marco 16:9 y `contain`, con un ancho máximo de 680 px; no estiran ni recortan el logotipo. El avance es cada cuatro segundos, con anterior, siguiente y pausa/reanudación. No se incluyen enlaces o seguimiento publicitario. El movimiento reducido comienza pausado. El temporizador se detiene fuera del área visible o con la app inactiva; solo se precarga la siguiente imagen. El estado del carrusel es independiente del de Noticias y no dispara consultas de actas ni nuevos recuentos de visitas.

Los PNG se incluyen como recursos estáticos de web y APK, sin nuevos módulos nativos. Validación: 427 pruebas y flujo móvil a 360 px para avance, pausa, controles, dimensiones constantes, ausencia de desbordamiento, parada fuera de pantalla y movimiento reducido. Revisión de transparencia y de legibilidad sobre azul oscuro. Mantener runtimes 0.1.11/0.1.12 y las copias de datos más recientes durante la publicación.

### 2026.11.15.11 — Patrocinadores sin flechas
El carrusel mantiene su diseño y cambio automático cada cuatro segundos, y permite deslizar horizontalmente en ambos sentidos. Se conservan el contador, la pausa, el desplazamiento vertical de Noticias y los controles accesibles por teclado/lector. La dirección del gesto se captura antes del actualizador de estado, evitando reutilizar el objeto mutable de PanResponder. Verificado con gestos táctiles de navegador, pausa, desplazamiento vertical y movimiento reducido; pruebas y comprobación de publicación correctas.

### 2026.11.15.12 — Sin contador de patrocinadores
Se retira únicamente el contador visible del carrusel. Se conservan navegación accesible, cambio automático, deslizamiento y pausa.

### 2026.11.15.13 — Premios Fantasy patrocinados
FantasyPrizeReceipt presenta al entrar los ingresos reales de fantasy_prize_events, con un logo existente del carrusel elegido por distribución estable del identificador del premio. No ejecuta liquidaciones ni modifica saldos. Agrupa por liga/jornada y suma ajustes pendientes para evitar mostrar importes antiguos; los ajustes negativos se distinguen. GET/POST /prize-receipts conservan controles de cuenta, pertenencia y equipo autorizado. El acuse en fantasy_prize_seen persiste entre dispositivos, es idempotente y cubre solo eventos hasta el mostrado (no oculta ajustes concurrentes). Requiere aplicar fantasy-prize-receipts-schema.sql a CHAT_DB antes del Worker. Lectura sin caché de saldo ni invalidación de copias por marcar visto. Diseño oscuro/dorado, imágenes originales, diálogo desplazable en pantallas pequeñas. Pruebas de premios 10/8/6/5, permisos, lectura repetida, agregación, ajustes concurrentes y saldo inalterado; interfaz en móvil pequeño, móvil y escritorio, incluido reintento sin conexión.

### 2026.11.15.14 — Desactivar avisos de votos
Ajustes → Notificaciones incorpora AdminVoteNotificationSettings, visible solo al administrador, con interruptor por cuenta y guardado confirmado por servidor. GET/POST /api/access/vote-notifications verifica administrador y origen; usa su UID autenticado y valida booleanos. Tabla vote_notification_preferences en VISITS_DB (migración vote-notification-preferences-schema.sql, también en access-schema.sql). El envío de votos filtra tanto la creación como el reintento de trabajos según preferencia actual; al reactivar usa la fecha del cambio como corte y evita avisos atrasados. No cambia tokens, avisos de solicitudes/resultados ni votos. Pruebas cubren aislamiento, permisos, entradas, reintentos silenciados, reactivación y guardado idempotente.

### 2026.11.15.15 — Cierre de alineaciones viernes 23:59 Madrid
La nueva regla sustituye la edición fuera de plazo: deadline() fija el último milisegundo del viernes de Madrid, con CET/CEST y sin adelantarlo por partidos del calendario. GET lineup devuelve locked; POST rechaza después del cierre tanto al entrar como justo antes de escribir, usando el reloj del servidor (también para clientes antiguos). No altera alineaciones ni puntos anteriores; no reaplica recuperaciones históricas. La interfaz bloquea puestos, formación, capitán, quitar y guardar, cierra selectores abiertos y restaura el once guardado al vencer el plazo, incluso con un borrador. Mantiene puntos sobre fotos y reapertura automática el lunes. Reglas y novedades actualizadas. Verificado límite exacto/midnight, petición que cruza el plazo, verano/invierno, persistencia sin cambios, legado puntuado y lunes; 434 pruebas y prueba de interfaz móvil/web del cierre y reapertura.
