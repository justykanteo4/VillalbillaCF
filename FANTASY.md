# VillalbillaFantasy — reglas y acceso de pruebas

La cabecera propia incluye icono, VillalbillaFantasy, ajustes e Ir a noticias. Abajo aparecen exclusivamente Plantilla, 11 inicial y Mercado. El acceso sigue reservado a administradores mientras se prueba; los demás usuarios ven la pantalla de construcción. El servidor conserva verifyAdmin en todas las rutas Fantasy.

## Compañeros y catálogo del club

Las ligas clásicas y personalizadas se vinculan a un equipo real de compañeros. El servidor obtiene los equipos del perfil de Firestore, limitado a status, claim.role, claim.teamId y claim.teamIds. Solo admite asignaciones aprobadas o perfiles de estado admin, con rol jugador/entrenador o el formato antiguo de entrenador. No usa el equipo elegido localmente como prueba de pertenencia.

Crear y entrar con código exige que el equipo de la liga esté en las asignaciones del usuario. Se comprueba otra vez al consultar ligas, detalles, mercado, plantillas y operaciones. Una liga ajena no aparece en Mis ligas y conocer su código no concede acceso. Para una oferta se vuelve a comprobar que el propietario o comprador pertenece al mismo grupo. Durante estas pruebas el administrador que realiza la consulta puede leer esos perfiles conforme a las reglas existentes de Firestore.

fantasy_league_groups separa el equipo de los participantes del catálogo de jugadores. El catálogo es siempre todo el club, incluso en ligas clásicas. Las ligas antiguas con pool de equipo se vinculan a ese equipo durante la migración. Se conservan participantes, códigos, presupuestos y fichajes. Las ligas clásicas se llaman automáticamente Liga de Infantil C, Liga de Aficionado, etc. Las personalizadas conservan el nombre elegido.

## Presupuesto y reglas

Clásicas: 40 M iniciales, +2 M cada lunes a las 00:00 de Madrid desde la entrada de cada miembro, quince participantes, once titular y dos fichajes por semana. Las personalizadas parten de 40 M y admiten presupuesto de 33–1000 M, 2–15 participantes, 0–10 fichajes y puntuaciones de −20 a 20.

Los puntos previstos son victoria 6, empate 5, derrota 4, gol +1, portería a cero de portero completo +1, MVP +1, once ideal +1, bonus único del capitán +1, amarilla −1, doble amarilla −3 en total, roja directa −4 y propia puerta −1. El capitán lo elige el usuario. Los administradores elegirán tres MVP de cada equipo ganador y el once ideal entre esos MVP. La edición del once y el cálculo jugable de puntos siguen en preparación.

El presupuesto no se aumenta para compensar los nuevos precios. Crear liga no exige pagar once jugadores inmediatamente: la plantilla se completa con los fichajes y aportaciones posteriores. Los precios no se reducen para forzar que el once quepa en 40 M.

## Precios: estadísticas, votaciones y subida del 80 %

El catálogo deportivo público se genera en prepare:release-data a partir de actas confirmadas. Suma cada participación en su equipo, sin duplicar los goles agregados de fichas. Un mismo jugador que actúa en varios equipos se agrupa por ID. La fecha y los datos parciales se muestran en la interfaz.

En cada consulta, el servidor suma los puntos activos 3/2/1 de las votaciones de jugadores y porteros de la temporada 2026-27. No utiliza votos de equipos o entrenadores para valorar a un futbolista ni publica identidades. Los cambios o retiradas de votos se reflejan en la siguiente valoración; la limpieza de votos de hinchas también actualiza automáticamente esos totales cuando se ejecuta.

Para TOP se ordena por goles × 3 + victorias × 2 + partidos × 0,4 + porterías a cero × 2 − rojas × 0,5 + puntos de votación × 0,15. El 10 % superior y los empates en el corte reciben TOP.

La base deportiva es la valoración anterior: 3 M más goles (0,6, máximo 6), victorias (0,5, máximo 4), partidos (0,15, máximo 2), porterías a cero (0,4, máximo 3) y 2 M para TOP; se redondea a medio millón, con límite de 20 M. Se añade 0,1 M por punto de votación, hasta 6 M. El resultado completo se multiplica por 1,8 y se redondea a una décima de millón. Una base de 3 M pasa a 5,4 M. Leer varias veces no vuelve a multiplicar el precio.

Todos los cálculos se realizan con el catálogo completo, también al filtrar precios por equipo en los ajustes: un jugador tiene el mismo valor en todas las ligas. El administrador mantiene la opción de fijar un precio final de 1–180 M, en pasos de 0,1 M, o restaurar el automático. Los precios manuales antiguos suben una única vez el 80 % durante la migración a fantasy_player_values; las ediciones posteriores son precios finales.

## Mercado, ofertas y precisión monetaria

Cada liga añade dos anuncios por día de Madrid si quedan jugadores libres. Mantiene como máximo diez; retira los más antiguos cuando falta espacio y aplica una caducidad máxima de siete días. El orden del catálogo se distribuye entre jugadores de todo el club; ampliar el catálogo no duplica las plazas de ese día ni retira anuncios vigentes. Los anuncios y el día procesado se guardan, de forma que dos dispositivos ven lo mismo.

Cada jugador tiene un único dueño dentro de cada liga y puede tener otros dueños en ligas distintas. Se puede comprar o enviar una oferta a otro propietario de la misma liga y equipo de compañeros. La oferta dura siete días y no reserva fondos. El vendedor acepta o rechaza; el comprador puede cancelar. Al aceptar se comprueban otra vez propiedad, pertenencia del comprador, saldo y cupo semanal. El cambio de jugador y ambos saldos se guardan juntos. Repetir una petición no repite pagos.

fantasy_wallet_values conserva los movimientos en décimas enteras para evitar errores monetarios. fantasy_wallets y las columnas históricas de importes se mantienen compatibles con el formato anterior. La migración convierte los movimientos anteriores con su equivalencia, sin subir ni volver a cobrar compras antiguas. Los triggers validan el saldo con décimas y actualizan conjuntamente ambas representaciones. La migración es idempotente.

Antes de desplegar esta versión se aplica fantasy-club-schema.sql después de fantasy-schema.sql. Los datos reales de ligas, plantillas, saldos, precios manuales y ofertas se guardan solo en CHAT_DB, fuera de Git y del paquete público. Las respuestas privadas son no-store. Las pruebas usan SQLite temporal y no crean operaciones ficticias en producción.

La vista previa autenticada de Fantasy también activa en segundo plano la tarea administrativa ya autorizada de retirada de votos de hinchas, si sigue pendiente. Comparte la misma cola y lease con Votaciones y conserva la clasificación segura y el respaldo privado. No inicia nuevas tareas ni expone identidades.
