# VillalbillaFantasy

## Acceso y secciones

Fantasy conserva el interruptor administrativo de cierre. Cerrado: solo administradores. Abierto: cuentas verificadas y aprobadas de jugadores y cuerpo técnico identificados en actas oficiales de su equipo. El código de una liga y el equipo elegido en pantalla no conceden acceso. Administradores sin identidad deportiva pueden administrar precios, acceso, sueldos y premios, pero jugar sigue exigiendo pertenecer a un equipo real. Las ligas de compañeros se crean automáticamente; crear una liga personalizada sigue en Próximamente.

Cabecera: icono, saldo disponible, Ir a noticias y ajustes. Pulsar el saldo abre los movimientos de la liga seleccionada, con presupuesto inicial, aportaciones, compras, ventas y sueldos, importes y saldo tras cada movimiento. Abajo: Plantilla, 11 inicial, Mercado y Clasificación. Si hay varias ligas propias se ofrece un selector compacto; no se muestra el bloque de liga/código para compartir dentro de Plantilla.

## Primera entrada y entrenador

Primero se explica la dinámica y se exige aceptarla antes de elegir a uno de los candidatos públicos: entrenadores, auxiliares, delegados y demás cuerpo técnico. Los IDs coinciden con las candidaturas de votaciones, agrupando todos sus equipos. El sueldo ofertado combina votos normalizados respecto al líder, rendimiento (victorias + medio empate por partido) y número de equipos. El baremo inicial usa 0,25 M de base, hasta 1,30 M de variable (60 % votaciones normalizadas y 40 % rendimiento en partidos), 0,15 M por equipo adicional hasta 0,45 M y un máximo absoluto de 2 M semanales. La contratación está habilitada.

Al contratar se fija el sueldo del contrato, que se cobra desde el siguiente lunes de Madrid. Cambiar de entrenador requiere un mes desde la última elección, con ajuste al último día del mes si hace falta. Nuevos precios no cambian unilateralmente contratos vigentes. Cada contrato y semana tiene un único asiento de sueldo; releer o reintentar no repite cobros. El presupuesto permite saldo negativo si un sueldo supera lo disponible; los fichajes comprueban el saldo real. Desde el 16 de noviembre de 2026 los premios de jornada sustituyen los 2 M semanales; se conservan las aportaciones históricas.

Entrenador: +2 por cada victoria y +1 por empate de cualquiera de sus equipos; una o varias amarillas en un partido restan −1 en total, y la roja −3. Las tarjetas solo proceden de la fuente pública identificada. El técnico puede ser elegido por varios participantes; la exclusividad de dueño se aplica a futbolistas.

## Reparto y Plantilla

Elegir entrenador y repartir es una operación atómica. La primera plantilla se completa hasta 14 con jugadores libres de valor bajo y fuera del TOP; no se descuenta su valor de los 52 M iniciales ni consume fichajes semanales. Se asigna un portero y jugadores de campo. Se preservan fichajes anteriores, si los hay. La elección concurrente no reparte dos veces ni deja contratos huérfanos.

El mercado reserva suficientes porteros sin TOP para las primeras plantillas de las plazas pendientes. Hay pruebas de quince plantillas iniciales simultáneas (210 futbolistas distintos). Los jugadores asignados se retiran de cualquier anuncio vigente. Luego se presenta la plantilla en tarjetas doradas con fotos y se puede repetir la presentación. Plantilla contiene solo entrenador/sueldo/cambio mensual y lista de jugadores, que abre estadísticas al pulsar la foto. Límites de 12–16 comprobados también por triggers, incluidas transferencias entre participantes.

## Once, capitán y puntos

Once jugadores distintos de la plantilla y capitán entre ellos. El campo permite elegir cualquier jugador para cada puesto. Cierre el viernes a las 23:59 de Madrid o antes si empieza el primer partido de la jornada. La revisión del guardado evita sobrescribir alineaciones de otro dispositivo. Vender antes del cierre retira ese jugador del borrador; después del cierre se conserva la alineación fijada.

El capitán duplica todos sus puntos, positivos y negativos, incluidos MVP y once ideal. No se aplica el antiguo bonus de +1. Deben pasar seis jornadas Fantasy con partidos del club desde su última capitanía; los descansos sin partidos no acortan ese plazo. Se comprueba en el selector y en el servidor.

Futbolistas: victoria 6, empate 5, derrota 4 para quienes juegan; gol +1; portero que completa el partido sin encajar +1; amarilla −1; doble amarilla −3 en total; roja directa −4; propia puerta −1. Los administradores confirman exactamente tres MVP de cada equipo ganador que hayan jugado (+1 cada uno) y un once ideal de once jugadores exclusivamente entre esos MVP (+1 más). Se permite retirar una selección completa para corregirla. Los premios tienen revisión y no se duplican con reintentos.

Las actas cerradas aportan puntos, con fecha de elección y alineación anteriores al partido. La jornada original se guarda antes de que cambien las fechas; un aplazado actualiza aquella jornada. Los premios entran automáticamente en los totales. La clasificación muestra el puesto (compartido en empates), puntos totales y +/− puntos por cada jornada; los datos incompletos se identifican como provisionales, sin inventar estadísticas. Los rivales solo reciben nombres y puntos, nunca UIDs.

## Mercado y favoritos

Hasta 8 anuncios, 2 nuevos cada día de Madrid y máximo 7 días; si falta espacio los nuevos esperan a que se liberen plazas. El mercado empieza al incorporarse el primer entrenador. Un futbolista tiene un único dueño dentro de cada liga y puede tener dueños distintos en otras ligas. Los valores combinan estadísticas y votos, conservando las subidas anteriores del 80 % y 30 %. Los administradores pueden fijar precios finales o restaurar el automático.

Búsqueda en todos los jugadores del club con foto, valor y puntos Fantasy. Favoritos privados: cuando aparece un anuncio se crea un aviso en la app y se envía push a los dispositivos vinculados al propietario. Se comprueba otra vez el dueño del token al entregar; con Fantasy cerrado solo reciben push dispositivos administradores. Al abrir se entra en Mercado, no en ajustes. Los avisos se deduplican por liga, usuario, futbolista y anuncio; la cola evita que avisos ya enviados bloqueen otros pendientes.

Una oferta enviada por participante, liga y día de Madrid, aunque después se rechace o cancele. Los reintentos de la misma oferta no consumen otra. Dura 7 días y no reserva fondos. Solo el vendedor acepta/rechaza y el comprador cancela. Al aceptar se comprueban propiedad, pertenencia, saldo, cupo semanal (2) y límites de ambas plantillas; traspaso y dinero se actualizan juntos.

## Sincronización y publicación

El cron actualiza el mercado una vez al día, liquida sueldos pendientes una vez por semana y entrega avisos de favoritos. Las actas se consultan por lotes pequeños, con lease, reintentos y backoff para fuentes sin cerrar. No se hacen consultas de Fantasy mientras no haya contratos. Los totales públicos se generan también en prepare:release-data mediante prepare-fantasy-sports.cjs. Las fotos existentes se reutilizan sin módulos nativos nuevos.

Las consultas repetidas tienen vías rápidas; los repartos, cobros y avisos se escriben por lotes para conservar los límites gratuitos de D1. Antes de desplegar se aplica fantasy-game-schema.sql tras las migraciones anteriores. No reinicia ligas, saldos, acceso ni votos. Los datos privados de contratos, plantillas, favoritos, transacciones y alineaciones quedan en CHAT_DB y no se incluyen en Git ni en el paquete público. Los datos públicos de actas sí se incluyen con sus pendientes. Las pruebas usan bases temporales y envíos push simulados, sin movimientos ni notificaciones ficticias en producción.

## Pujas y premios (14 de noviembre)

El mercado muestra arriba un contador actualizado cada segundo hasta las 23:59 de Madrid. La puja válida más alta gana; en empate se respeta la primera. Las reservas reducen el saldo disponible y los cupos. No hay compra inmediata. Sin pujas el anuncio continúa hasta siete días; con ocho anuncios los nuevos esperan espacio.

Los premios son 10 M al primero, 8 M al segundo, 6 M al tercero y 5 M al resto; los empates comparten puesto. Sustituyen la aportación fija desde la semana del 16 de noviembre. Se espera la selección de MVP y once ideal cuando corresponde; los resultados pendientes pueden producir premios provisionales. Cada jornada tiene un asiento único y las correcciones registran solo diferencias.

Aplicar fantasy-rewards-schema.sql y después fantasy-auction-schema.sql, sin volver a aplicar los triggers antiguos de compraventa. Las pujas y sus propietarios permanecen privados en D1.

## Diseño, once y copias locales (14 de noviembre, revisión 2)

Toda la zona Fantasy usa fondos oscuros, superficies antracita y acentos dorados. Mercado usa pestañas, tarjetas con foto, puntos, valor y puja; las reglas completas permanecen en ajustes.

El once permite siete formaciones (4-4-2, 4-3-3, 4-5-1, 3-5-2, 3-4-3, 5-3-2 y 5-4-1). Cualquier jugador de la plantilla puede ocupar cualquier puesto; elegir uno ya alineado intercambia los puestos. El selector es una ventana desplazable. Tras el cierre se prepara la semana siguiente sin modificar los puntos ni el once de la actual. El servidor valida semana, revisión, propiedad, once distintos y rotación de capitán. Aplicar fantasy-lineup-schema.sql antes de desplegar.

Las copias de Fantasy se guardan en AsyncStorage por UID y recurso, separadas del archivo público y exportaciones de copias deportivas. Se presentan antes de consultar red; las recientes se reutilizan durante 15 segundos. Mercado y actualización del once fuerzan consulta; cada mutación invalida todas las copias de esa cuenta, también tras reiniciar. Las denegaciones no se sustituyen por copias offline; el servidor sigue autorizando toda operación.

## Selector de ligas en cabecera (14/11/2026)

El nombre de la liga activa es un selector con las ligas de esa cuenta. Se cambia desde la cabecera, conservando plantillas y movimientos independientes. Entrar o empezar otra liga abre los equipos autorizados: el servidor crea la liga clásica del equipo cuando todavía no existe, o incorpora a la existente según los límites vigentes. La liga personalizada continúa en Próximamente. Cada respuesta de plantilla lleva su identificador de liga en la vista para impedir que una carga anterior sustituya los jugadores o el saldo de la liga seleccionada. La última liga se recuerda con la cuenta y se valida contra las ligas devueltas por el servidor al volver a entrar.

## Entrada por Tus ligas (14/11/2026, revisión 7)

Al entrar desde el club o volver a abrir Fantasy se muestra la pantalla Tus ligas. Cada tarjeta abre una liga existente de esa cuenta. Crear nueva liga está desactivado y marcado En construcción; la interfaz ya no ofrece crear ni incorporarse a ligas nuevas. Las ligas existentes se mantienen. No se solicita la plantilla ni se muestran saldo o pestañas de juego hasta elegir una liga.

Dentro de la liga se muestra una franja de cabecera de ancho completo con borde dorado, LIGA ACTUAL, su nombre y Cambiar. El menú permite alternar entre ligas existentes o volver a Tus ligas; su opción de crear también está desactivada. Se sustituye la apertura automática de la última liga por la elección explícita solicitada.

## Venta inmediata desde 11 inicial (14/11/2026, revisión 8)

Vender jugador abre la plantilla de esa liga. Seleccionar uno consulta un importe actual al servidor y muestra ¿Quieres vender a [nombre]?, valor de mercado, descuento del 8 %, importe a recibir y Cancelar/Confirmar venta. Consultar o cancelar nunca ejecuta la venta. El servidor vuelve a comprobar propiedad, liga, precio y mínimo de 12. Se paga el 92 %, redondeado a céntimos de millón. Un precio distinto requiere volver a consultar y confirmar.

fantasy-sales-schema.sql añade el registro y los triggers de venta sin sustituir los de subastas. Un INSERT liquida la venta de forma atómica: libera la propiedad, abona la cartera, cancela ofertas y retira al jugador únicamente de alineaciones todavía abiertas, incrementando sus revisiones. Cada propiedad tiene una sola venta; la clave de solicitud y la propiedad hacen idempotentes los reintentos. Las jornadas cerradas y sus puntos se conservan. El jugador queda libre para futuras rotaciones normales de mercado, sin crear anuncios extra ni consumir fichajes de compra semanales.

Las transacciones muestran Venta al mercado con el importe efectivamente abonado. La copia privada de la cuenta se invalida como en cualquier otra operación; la alineación y el saldo se vuelven a consultar tras vender. Aplicar únicamente fantasy-sales-schema.sql antes de desplegar esta revisión.

## Ubicación de la venta (revisión 9)

La venta se encuentra en Plantilla: pulsar un jugador abre sus datos y su botón Vender jugador. El botón abre directamente la confirmación de ese jugador, sin un segundo selector. Se retira de 11 inicial. La operación y sus garantías del 8 % se mantienen; tras confirmar se refrescan plantilla y saldo, y el servidor conserva la limpieza de los onces abiertos.
