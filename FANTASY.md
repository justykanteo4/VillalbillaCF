# VillalbillaFantasy — ligas en pruebas

El acceso está en la cabecera pública y en Noticias, debajo del resumen del club. Jugadores, entrenadores, aficionados y usuarios sin sesión siguen viendo «Está en construcción. ¡Ya queda poco!». Solo los administradores pueden probar las ligas. La autorización del servidor se comprueba en todas las rutas `/api/fantasy` y `/api/fantasy/*`.

Al entrar aparece Crear liga con dos opciones:

- Jugar con tu equipo: jugadores de un equipo del club y ajustes clásicos. Nombre automático según categoría y letra del equipo, por ejemplo «Liga de Infantil C»; las ligas clásicas anteriores se muestran también con este nombre.
- Crear liga personalizada: jugadores de un equipo, una categoría o todo el club. El creador elige presupuesto, máximo de participantes, fichajes por jornada, hora de cierre del viernes y puntuaciones.

Las ligas y participantes se guardan en las tablas privadas `fantasy_leagues` y `fantasy_members` de CHAT_DB, creadas por `fantasy-schema.sql`. Cada liga genera un código aleatorio de ocho caracteres para invitar. Mis ligas recupera las membresías de la cuenta; los detalles y precios exigen pertenecer a la liga. No se publican identificadores de usuario ni datos de ligas en el paquete sin conexión. Las respuestas usan no-store. Una solicitud repetida no duplica la liga y la base de datos impide superar el aforo, incluso con entradas simultáneas. Durante las pruebas se permiten hasta 25 ligas por creador.

Los ajustes clásicos son 15 participantes, 100 millones, once titular, dos fichajes por jornada, viernes 23:59 de Madrid, resultado 6/5/4, gol +1, portería a cero del portero que completa +1, MVP +1, once ideal +1, capitán un único +1, amarilla −1, doble amarilla −3 en total, roja directa −4 y propia puerta −1. Los administradores eligen tres MVP de cada equipo ganador y el once ideal entre esos MVP. Un jugador puede estar en varios equipos Fantasy para evitar la escasez al jugar con una sola plantilla.

La liga personalizada admite 33–1000 millones, 2–15 participantes, 0–10 fichajes y puntuaciones enteras de −20 a 20. Antes de crear se exige que haya al menos once jugadores y presupuesto suficiente para los once más baratos. Los ajustes quedan guardados al crear la liga; esta fase no incluye edición posterior.

Los precios iniciales se calculan en `fantasy-leagues.cjs`, con estadísticas públicas de actas de los equipos elegidos. `scripts/prepare-fantasy-players.cjs` genera `fantasy-players.json` durante prepare:release-data. No suma al equipo receptor los goles de la categoría de origen: cuenta las participaciones confirmadas en cada equipo. La pantalla muestra la fecha y marca los datos parciales.

El rendimiento para identificar el 10 % superior es goles × 3 + victorias × 2 + partidos × 0,4 + porterías a cero × 2 − rojas × 0,5. Los empates en el corte comparten la etiqueta TOP. El precio parte de 3 M y añade goles (0,6, máximo 6), victorias (0,5, máximo 4), partidos (0,15, máximo 2), porterías a cero (0,4, máximo 3) y 2 M para TOP. Se redondea a medio millón, entre 3 y 20 M. Si los once más baratos superan los 100 M, se rebajan todos por pasos de 0,5 M, sin bajar de 3 M, para que la modalidad clásica siga siendo viable. Es una valoración inicial actualizada con las publicaciones del catálogo, no una cotización de mercado en tiempo real.

La creación, la invitación y la consulta de participantes y precios ya persisten. Los fichajes, alineaciones y cálculo jugable de puntos siguen en preparación; la interfaz lo indica expresamente. No se habilita el juego al público con esta publicación.

El icono exclusivo `assets/villalbilla-fantasy-icon.png` conserva su resolución y colores originales. La zona Fantasy usa `fantasy-theme.cjs`: fondo celeste (#87CEEB), superficies violetas, texto crema y detalles dorados. Al salir se restaura la paleta del club.
