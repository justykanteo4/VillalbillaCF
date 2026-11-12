# Jugadores de categorías inferiores

`reinforcements-seed.json` se prepara a partir de las plantillas públicas y las actas incluidas. Aporta una primera vista sin conexión. `useTeamReinforcements` revisa las actas del equipo al abrir su gestión, al volver a primer plano y cada cinco minutos; Actualizar plantilla fuerza una revisión. Reutiliza las actas históricas cerradas guardadas en el dispositivo y consulta en paralelo como máximo tres actas. También revisa partidos recientes cuyo calendario todavía no tenga marcador.

Solo añade un refuerzo cuando el acta está cerrada, corresponde al equipo, no está suspendida y confirma que el jugador fue titular o entró como sustituto. El origen se identifica por su ficha de una categoría de edad inferior del club (por ejemplo Juvenil frente a Aficionado). No basta una convocatoria, una tarjeta de un suplente ni aparecer en una plantilla. Los datos no confirmados y las categorías de origen desconocidas no se inventan.

La ficha se añade una sola vez, con categoría y equipo de origen, al final de Plantilla en los tres órdenes de visualización. Si el jugador ya figura en la plantilla federativa del equipo superior, se marca y se mueve al bloque final sin duplicarlo. No se copian sus goles, tarjetas ni dorsal del equipo inferior al superior.

Los jugadores confirmados se incorporan al espacio del equipo con su identificador federativo para la gestión. Se conservan alias, posiciones, asistencia y demás información privada existente. Un fallo de conexión mantiene la última comprobación confirmada, guardada en `team-reinforcements.v1.<equipo>`. Una revisión oficial correcta puede reemplazar la prueba de un partido; participar en otro partido confirmado mantiene al jugador en la lista.

# Entrenadores y cuerpo técnico en Votaciones

La categoría interna sigue siendo `trainer`. Incluye entrenadores, delegados, auxiliares y miembros del cuerpo técnico publicados en fichas de equipo o actas. Una persona ocupa una sola candidatura aunque tenga varias funciones o equipos. Se conserva su identificador anterior para mantener los votos y el límite de cuatro cambios por categoría. Se descartan marcadores como «No presenta» y personal de equipos rivales.

# Estadísticas con el equipo superior

Los registros de refuerzos con `statisticsVersion: 2` incluyen las convocatorias de jugadores de categoría inferior, también cuando no entran al campo. La ficha solo se añade tras una participación confirmada y suma únicamente las actas de ese equipo: goles personales (sin propia puerta), amarillas, rojas, convocatorias y partidos jugados. Las segundas amarillas cuentan también como expulsión. Cada acta se cuenta una vez. Si no se pueden identificar los autores de los goles o el listado no cuadra con el marcador, los goles quedan pendientes en lugar de inventar un cero.

La ficha permite mostrar los minutos públicos de las actas de fútbol 11 del equipo superior, conservando los minutos manuales ya compartidos. Los registros antiguos sin estadísticas se recalculan a partir de las actas guardadas; no reemplazan una copia nueva con estadísticas. Si falta conexión se conserva la identidad de los refuerzos anteriores y se indican los datos pendientes. Una ficha agregada de temporada de un jugador con varios equipos no sustituye estos totales por equipo.
