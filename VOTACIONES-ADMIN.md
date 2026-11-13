# Detalle de votos para administradores

En Votaciones, los administradores disponen de Ver detalle de votos para toda la categoría y de Ver quién ha votado a cada candidatura del ranking. Se aplica a jugadores, porteros, equipos y entrenadores, delegados y cuerpo técnico.

GET /api/social/admin/votes?category=player admite candidate y offset. Comprueba verifyAdmin en cada petición y solo permite GET. Devuelve veinte elecciones por página, totales de votos y puntos, candidatura, nombre de la cuenta, puntos y última actualización. Consulta social_ballots, por lo que refleja las elecciones vigentes y sus cambios o retiradas; no es un historial de votos eliminados. No modifica votos ni consume cambios.

Los nombres de los votos existentes se resuelven desde trainerProfiles con el token del administrador, sujeto a las reglas actuales de Firestore. La máscara de lectura solicita únicamente name, claim.name y status. No se obtienen ni publican correos o teléfonos. Los nombres válidos se conservan cinco minutos en memoria del servidor, hasta mil cuentas; un fallo no se almacena como éxito. Si falta un perfil o nombre, se muestra Nombre no disponible y una referencia estable derivada, sin inventar identidades ni devolver UIDs. Se indica que se puede reintentar.

La respuesta usa Cache-Control: no-store. AdminVoteDetails usa una petición privada con no-store, sin AsyncStorage ni copia sin conexión; cancela las consultas al salir o cambiar de identidad y desmonta la vista si deja de mostrarse como administrador. Ocultar el botón es solo una ayuda visual: la ruta protegida rechaza a usuarios no administradores aunque construyan la URL manualmente. El endpoint público de votos no incorpora nombres ni referencias de votantes, incluso si se añaden parámetros de administración.

Los nombres de otros votantes solo se consultan al abrir el detalle privado. El permiso para emitir votos se comprueba por separado con el estado y el rol del perfil propio. No se envían notificaciones nuevas ni se modifica el reparto 3/2/1 o los cuatro cambios. Las pruebas de interfaz usan votos y cuentas ficticios en SQLite temporal; no crean votos de prueba en producción.

## Restricción temporal para hinchas

Los hinchas y cuentas sin acceso aprobado pueden consultar rankings y sus elecciones anteriores, pero no emitir, sustituir ni retirar votos por ahora. No se borran elecciones anteriores ni se alteran sus puntos. Los comentarios y me gusta de partidos conservan sus permisos anteriores.

vote-access.mjs permite votar a perfiles approved con teamId y rol player o trainer. Conserva compatibilidad con entrenadores aprobados antiguos sin campo role. Para cuentas sin ese acceso, comprueba verifyAdmin; el estado admin escrito en un perfil por sí solo no sustituye esa autorización. Pendientes, rechazados, hinchas y cuentas sin asignar no pueden votar. La consulta de perfil usa el token del usuario y una máscara limitada a status, claim.role y claim.teamId, sin caché de permisos.

Cada POST y DELETE de /api/social/votes vuelve a comprobar este permiso en el servidor antes de tocar votos, cuotas o avisos. Los clientes antiguos tampoco pueden saltarlo enviando un rol o estado en el cuerpo. GET /api/social/vote-access devuelve únicamente el permiso de la sesión actual y su explicación, con no-store. No acepta seleccionar el UID de otra cuenta.

useVoteAccess comprueba el permiso al entrar, volver al primer plano o actualizar votos; mientras no haya confirmación bloquea Dar y Retirar. No guarda permisos en AsyncStorage. Un cambio de cuenta invalida el resultado anterior. El detalle privado de administradores sigue exigiendo verifyAdmin y permanece disponible para ellos.
