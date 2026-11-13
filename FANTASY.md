# VillalbillaFantasy — acceso mediante actas

La cabecera propia incluye icono, VillalbillaFantasy, ajustes e Ir a noticias. Abajo aparecen exclusivamente Plantilla, 11 inicial y Mercado. Los ajustes de precios exigen autorización de administrador en el servidor, independientemente de los botones visibles.

## Interruptor administrativo de acceso

En Ajustes → Acceso a Fantasy y en el engranaje de Fantasy, solo los administradores pueden consultar o modificar «Deshabilitar Fantasy». La ruta `/api/fantasy/admin/access` comprueba la condición de administrador en el servidor. Los cambios usan revisión para impedir que un administrador sobrescriba una decisión posterior de otro.

`fantasy-access-schema.sql` crea un ajuste global inicialmente cerrado; las repeticiones conservan la decisión guardada. Con el cierre activo, únicamente los administradores acceden a Fantasy. Los demás ven «Próximamente» y cualquier consulta u operación de liga, catálogo, mercado u ofertas devuelve 403, incluso en versiones antiguas de la app. No se eliminan ligas ni movimientos. La pantalla vuelve a comprobar el acceso al regresar al primer plano y cada 30 segundos, sin desmontar los formularios durante consultas normales. Reabrir conserva el requisito de identidad oficial para jugadores y cuerpo técnico. Los administradores siguen necesitando identidad deportiva para jugar con un equipo, pero pueden administrar siempre.

## Compañeros y catálogo del club

Cuando Fantasy está habilitado, solo pueden jugar cuentas verificadas y aprobadas cuya identidad corresponde a un jugador o miembro del cuerpo técnico presente en las actas oficiales cerradas. `prepare-fantasy-membership.cjs` genera el índice público de identidades deportivas desde la copia pública de actas; no incluye cuentas, correos ni perfiles privados. Identifica jugadores por su ID federativo y técnicos por su nombre completo normalizado. Ni el rol ni el equipo elegido en pantalla conceden acceso por sí solos. Una cuenta pendiente o de hincha no accede por reclamar una identidad pública. Los administradores pueden gestionar precios aunque no tengan una identidad deportiva; no obtienen por ello acceso a jugar.

El servidor consulta exclusivamente el perfil del usuario autenticado. Contrasta sus IDs de jugador y nombre con las actas y registra los equipos confirmados. Vuelve a comprobarlo al listar ligas, entrar, consultar el mercado y operar. Las ofertas comprueban la pertenencia del otro participante mediante el registro escrito por el servidor al verificar su propia cuenta, sin leer perfiles privados con el token de otro usuario. Una revocación se aplica en la siguiente consulta de esa cuenta y conserva el historial de fichajes.

Cada equipo tiene una liga automática clásica: Liga de Infantil C, Liga de Aficionado, etc. Se reutiliza la liga clásica existente del equipo para conservar participantes, códigos y fichajes. Entrar es idempotente y requiere identidad oficial de ese equipo; el sistema crea la liga si falta. La creación manual de ligas se deshabilita en el servidor y en la interfaz con «Próximamente». Las ligas existentes se conservan. `fantasy_league_groups` identifica el equipo de compañeros; el mercado incluye siempre a todos los jugadores del club.

## Presupuesto y reglas

Clásicas: 52 M iniciales, +2 M cada lunes a las 00:00 de Madrid desde la entrada de cada miembro, quince participantes, once titular y dos fichajes por semana. La creación de ligas personalizadas está deshabilitada temporalmente.

Los puntos previstos son victoria 6, empate 5, derrota 4, gol +1, portería a cero de portero completo +1, MVP +1, once ideal +1, bonus único del capitán +1, amarilla −1, doble amarilla −3 en total, roja directa −4 y propia puerta −1. El capitán lo elige el usuario. Los administradores elegirán tres MVP de cada equipo ganador y el once ideal entre esos MVP. La edición del once y el cálculo jugable de puntos siguen en preparación.

La subida actual aumenta un 30 % el presupuesto inicial, sin modificar aportaciones semanales, gastos ni fichajes previos. No se exige comprar once jugadores de golpe.

## Precios: estadísticas, votaciones y aumento adicional del 30 %

El catálogo deportivo público se genera en prepare:release-data a partir de actas confirmadas. Suma cada participación en su equipo, sin duplicar los goles agregados de fichas. Un mismo jugador que actúa en varios equipos se agrupa por ID. La fecha y los datos parciales se muestran en la interfaz.

En cada consulta, el servidor suma los puntos activos 3/2/1 de las votaciones de jugadores y porteros de la temporada 2026-27. No utiliza votos de equipos o entrenadores para valorar a un futbolista ni publica identidades. Los cambios o retiradas de votos se reflejan en la siguiente valoración; la limpieza de votos de hinchas también actualiza automáticamente esos totales cuando se ejecuta.

Para TOP se ordena por goles × 3 + victorias × 2 + partidos × 0,4 + porterías a cero × 2 − rojas × 0,5 + puntos de votación × 0,15. El 10 % superior y los empates en el corte reciben TOP.

La base deportiva es la valoración anterior: 3 M más goles (0,6, máximo 6), victorias (0,5, máximo 4), partidos (0,15, máximo 2), porterías a cero (0,4, máximo 3) y 2 M para TOP; se redondea a medio millón, con límite de 20 M. Se añade 0,1 M por punto de votación, hasta 6 M. El resultado completo se multiplica por 1,8 y se redondea a una décima de millón. A ese precio anterior se aplica ahora un 30 % adicional, con precisión de 0,01 M: una base anterior de 5,4 M pasa a 7,02 M. Leer varias veces no vuelve a multiplicar el precio.

Todos los cálculos se realizan con el catálogo completo, también al filtrar precios por equipo en los ajustes: un jugador tiene el mismo valor en todas las ligas. El administrador mantiene la opción de fijar un precio final de 1–234 M, en pasos de 0,01 M, o restaurar el automático. Los precios manuales antiguos suben una única vez el 80 % durante la migración a fantasy_player_values; la migración actual `fantasy-actas-schema.sql` aplica el 30 % adicional una sola vez a los precios manuales existentes. Las ediciones posteriores son precios finales.

## Mercado, ofertas y precisión monetaria

Cada liga añade dos anuncios por día de Madrid si quedan jugadores libres. Mantiene como máximo diez; retira los más antiguos cuando falta espacio y aplica una caducidad máxima de siete días. El orden del catálogo se distribuye entre jugadores de todo el club; ampliar el catálogo no duplica las plazas de ese día ni retira anuncios vigentes. Los anuncios y el día procesado se guardan, de forma que dos dispositivos ven lo mismo.

Cada jugador tiene un único dueño dentro de cada liga y puede tener otros dueños en ligas distintas. Se puede comprar o enviar una oferta a otro propietario de la misma liga y equipo de compañeros. La oferta dura siete días y no reserva fondos. El vendedor acepta o rechaza; el comprador puede cancelar. Al aceptar se comprueban otra vez propiedad, pertenencia del comprador, saldo y cupo semanal. El cambio de jugador y ambos saldos se guardan juntos. Repetir una petición no repite pagos.

`fantasy_wallet_cents` conserva los movimientos en céntimos de millón enteros. `fantasy_player_cents` contiene los precios manuales finales. Las columnas históricas de importes se mantienen compatibles. El presupuesto inicial almacenado se incrementa un 30 % una sola vez, con una marca de migración. La migración convierte los movimientos anteriores con su equivalencia, sin subir ni volver a cobrar compras antiguas. Los triggers validan el saldo con céntimos y actualizan conjuntamente las representaciones. La migración es idempotente; debe ejecutarse después de `fantasy-club-schema.sql`.

Antes de desplegar esta versión se aplican fantasy-actas-schema.sql después de fantasy-schema.sql y fantasy-club-schema.sql, y fantasy-access-schema.sql. Los datos reales de ligas, plantillas, saldos, precios manuales y ofertas se guardan solo en CHAT_DB, fuera de Git y del paquete público. Las respuestas privadas son no-store. Las pruebas usan SQLite temporal y no crean operaciones ficticias en producción.

La vista previa autenticada de Fantasy también activa en segundo plano la tarea administrativa ya autorizada de retirada de votos de hinchas, si sigue pendiente. Comparte la misma cola y lease con Votaciones y conserva la clasificación segura y el respaldo privado. No inicia nuevas tareas ni expone identidades.
