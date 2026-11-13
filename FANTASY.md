# VillalbillaFantasy — ligas en pruebas

El acceso está en la cabecera pública y en Noticias, debajo del resumen del club. Jugadores, entrenadores, aficionados y usuarios sin sesión siguen viendo «Está en construcción. ¡Ya queda poco!». Solo los administradores pueden probar las ligas. La autorización del servidor se comprueba en todas las rutas `/api/fantasy` y `/api/fantasy/*`.

Al entrar aparece Crear liga con dos opciones:

- Jugar con tu equipo: jugadores de un equipo del club y ajustes clásicos. Nombre automático según categoría y letra del equipo, por ejemplo «Liga de Infantil C»; las ligas clásicas anteriores se muestran también con este nombre.
- Crear liga personalizada: jugadores de un equipo, una categoría o todo el club. El creador elige presupuesto, máximo de participantes, fichajes por jornada, hora de cierre del viernes y puntuaciones.

Las ligas y participantes se guardan en las tablas privadas `fantasy_leagues` y `fantasy_members` de CHAT_DB, creadas por `fantasy-schema.sql`. Cada liga genera un código aleatorio de ocho caracteres para invitar. Mis ligas recupera las membresías de la cuenta; los detalles y precios exigen pertenecer a la liga. No se publican identificadores de usuario ni datos de ligas en el paquete sin conexión. Las respuestas usan no-store. Una solicitud repetida no duplica la liga y la base de datos impide superar el aforo, incluso con entradas simultáneas. Durante las pruebas se permiten hasta 25 ligas por creador.

Los ajustes clásicos son 15 participantes, 40 millones iniciales y 2 millones cada lunes, once titular, dos fichajes por jornada, viernes 23:59 de Madrid, resultado 6/5/4, gol +1, portería a cero del portero que completa +1, MVP +1, once ideal +1, capitán un único +1, amarilla −1, doble amarilla −3 en total, roja directa −4 y propia puerta −1. Los administradores eligen tres MVP de cada equipo ganador y el once ideal entre esos MVP. Un jugador puede estar en varios equipos Fantasy para evitar la escasez al jugar con una sola plantilla.

La liga personalizada admite 33–1000 millones, 2–15 participantes, 0–10 fichajes y puntuaciones enteras de −20 a 20. Antes de crear se exige que haya al menos once jugadores y presupuesto suficiente para los once más baratos. Los ajustes quedan guardados al crear la liga; esta fase no incluye edición posterior.

Los precios iniciales se calculan en `fantasy-leagues.cjs`, con estadísticas públicas de actas de los equipos elegidos. `scripts/prepare-fantasy-players.cjs` genera `fantasy-players.json` durante prepare:release-data. No suma al equipo receptor los goles de la categoría de origen: cuenta las participaciones confirmadas en cada equipo. La pantalla muestra la fecha y marca los datos parciales.

El rendimiento para identificar el 10 % superior es goles × 3 + victorias × 2 + partidos × 0,4 + porterías a cero × 2 − rojas × 0,5. Los empates en el corte comparten la etiqueta TOP. El precio parte de 3 M y añade goles (0,6, máximo 6), victorias (0,5, máximo 4), partidos (0,15, máximo 2), porterías a cero (0,4, máximo 3) y 2 M para TOP. Se redondea a medio millón, entre 3 y 20 M. Si los once más baratos superan los 40 M, se rebajan todos por pasos de 0,5 M, sin bajar de 3 M, para que la modalidad clásica siga siendo viable. Es una valoración inicial actualizada con las publicaciones del catálogo, no una cotización de mercado en tiempo real.

La creación, la invitación y la consulta de participantes y precios ya persisten. Los fichajes, alineaciones y cálculo jugable de puntos siguen en preparación; la interfaz lo indica expresamente. No se habilita el juego al público con esta publicación.

El icono exclusivo `assets/villalbilla-fantasy-icon.png` conserva su resolución y colores originales. La zona Fantasy usa `fantasy-theme.cjs`: fondo celeste (#87CEEB), superficies violetas, texto crema y detalles dorados. Al salir se restaura la paleta del club.

## Ajustes y precios manuales

El engranaje dentro de Fantasy abre los ajustes de administradores: catálogo con fotos, búsqueda por nombre, filtro por equipo, precio automático de referencia, precio vigente y fecha del último ajuste. Cada jugador admite un precio global manual entre 1 y 100 M, en pasos de 0,5 M, o restaurar su cálculo automático. El precio manual prevalece en todos los equipos y ligas de ese jugador, sin alterar presupuestos ni reglas existentes. La creación de nuevas ligas comprueba el presupuesto con estos precios vigentes.

`fantasy_player_prices` de CHAT_DB almacena precio (null si automático), revisión, fecha y UID del administrador que hizo el último cambio. Son datos privados y no se exportan en el paquete público. Los GET privados omiten UID. El guardado exige la revisión leída para impedir sobrescrituras silenciosas entre administradores; restaurar automático incrementa también la revisión. Todas las rutas de ajustes verifican verifyAdmin, origen en escrituras y no-store. Actualizar las estadísticas no borra estas filas. El precio automático de referencia depende del conjunto de equipos elegido; el manual es global.

## Navegación propia

Al entrar en Fantasy, la cabecera contiene el icono, VillalbillaFantasy, Ir a noticias y el engranaje de Fantasy (solo administradores). Sustituye la cabecera del club y el antiguo bloque repetido dentro del contenido. La barra inferior muestra exclusivamente Plantilla, 11 inicial y Mercado; al volver a Noticias reaparecen las ocho pestañas del club. La barra se oculta al abrir el teclado y respeta el área segura inferior.

Plantilla mantiene la creación y entrada a ligas y sus detalles. Mercado consulta precios vigentes según la liga elegida, incluidos los ajustes manuales de administradores. 11 inicial muestra las reglas de cierre y el estado de preparación de la edición del once; los fichajes y el cálculo jugable de puntos siguen sin habilitar. El botón Atrás vuelve a Plantilla antes de salir de Fantasy. Los no administradores mantienen la pantalla de construcción y no consultan API privadas aunque pulsen las pestañas.

## Presupuesto semanal

Las ligas clásicas, incluidas las existentes en pruebas, usan 40 M iniciales. Las personalizadas empiezan por defecto en 40 M y conservan el presupuesto elegido por su creador. Ambas reciben 2 M semanales por participante. El servidor calcula las semanas transcurridas desde la fecha de entrada guardada en fantasy_members, con corte el lunes a las 00:00 de Europe/Madrid. No concede aportaciones por semanas anteriores a la entrada. Los cambios de hora se resuelven por fechas civiles de Madrid.

Las lecturas de Mis ligas y detalles incluyen finance (inicial, aportación, semanas, total aportado y presupuesto acumulado). El cálculo usa el reloj del servidor, funciona sin abrir la app y repetir consultas o volver a unirse no duplica ni reinicia el dinero. No requiere cron ni nuevas tablas. Es presupuesto acumulado: todavía no existe gasto por fichajes, ya que el mercado jugable sigue en preparación. Los precios automáticos se normalizan para que los once más baratos no excedan 40 M; los precios manuales de administradores conservan prioridad.
