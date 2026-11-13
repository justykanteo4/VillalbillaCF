# Detalle de votos para administradores

En Votaciones, los administradores disponen de Ver detalle de votos para toda la categoría y de Ver quién ha votado a cada candidatura del ranking. Se aplica a jugadores, porteros, equipos y entrenadores, delegados y cuerpo técnico.

GET /api/social/admin/votes?category=player admite candidate y offset. Comprueba verifyAdmin en cada petición y solo permite GET. Devuelve veinte elecciones por página, totales de votos y puntos, candidatura, nombre de la cuenta, puntos y última actualización. Consulta social_ballots, por lo que refleja las elecciones vigentes y sus cambios o retiradas; no es un historial de votos eliminados. No modifica votos ni consume cambios.

Los nombres de los votos existentes se resuelven desde trainerProfiles con el token del administrador, sujeto a las reglas actuales de Firestore. La máscara de lectura solicita únicamente name, claim.name y status. No se obtienen ni publican correos o teléfonos. Los nombres válidos se conservan cinco minutos en memoria del servidor, hasta mil cuentas; un fallo no se almacena como éxito. Si falta un perfil o nombre, se muestra Nombre no disponible y una referencia estable derivada, sin inventar identidades ni devolver UIDs. Se indica que se puede reintentar.

La respuesta usa Cache-Control: no-store. AdminVoteDetails usa una petición privada con no-store, sin AsyncStorage ni copia sin conexión; cancela las consultas al salir o cambiar de identidad y desmonta la vista si deja de mostrarse como administrador. Ocultar el botón es solo una ayuda visual: la ruta protegida rechaza a usuarios no administradores aunque construyan la URL manualmente. El endpoint público de votos no incorpora nombres ni referencias de votantes, incluso si se añaden parámetros de administración.

No se añaden consultas de perfiles al votar: solo al abrir el detalle privado. No se envían notificaciones nuevas ni se modifica el reparto 3/2/1 o los cuatro cambios. Las pruebas de interfaz usan votos y cuentas ficticios en SQLite temporal; no crean votos de prueba en producción.
