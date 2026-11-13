# VillalbillaFantasy

## Acceso y secciones

Fantasy conserva el interruptor administrativo de cierre. Cerrado: solo administradores. Abierto: cuentas verificadas y aprobadas de jugadores y cuerpo técnico identificados en actas oficiales de su equipo. El código de una liga y el equipo elegido en pantalla no conceden acceso. Administradores sin identidad deportiva pueden administrar precios, acceso, sueldos y premios, pero jugar sigue exigiendo pertenecer a un equipo real. Las ligas de compañeros se crean automáticamente; crear una liga personalizada sigue en Próximamente.

Cabecera: icono, saldo disponible, Ir a noticias y ajustes. Pulsar el saldo abre los movimientos de la liga seleccionada, con presupuesto inicial, aportaciones, compras, ventas y sueldos, importes y saldo tras cada movimiento. Abajo: Plantilla, 11 inicial, Mercado y Clasificación. Si hay varias ligas propias se ofrece un selector compacto; no se muestra el bloque de liga/código para compartir dentro de Plantilla.

## Primera entrada y entrenador

Primero se explica la dinámica y se exige aceptarla antes de elegir a uno de los candidatos públicos: entrenadores, auxiliares, delegados y demás cuerpo técnico. Los IDs coinciden con las candidaturas de votaciones, agrupando todos sus equipos. El sueldo ofertado se calcula como base + puntos de votación × coeficiente + victorias × coeficiente + empates × coeficiente + equipos adicionales × suplemento. Los importes y coeficientes están **pendientes de fijar con el usuario**: el sueldo base inicial es NULL y no se permite contratar ni cobrar hasta publicarlo. Las pruebas configuran importes únicamente en SQLite temporal.

Al contratar se fija el sueldo del contrato, que se cobra desde el siguiente lunes de Madrid. Cambiar de entrenador requiere un mes desde la última elección, con ajuste al último día del mes si hace falta. Nuevos precios no cambian unilateralmente contratos vigentes. Cada contrato y semana tiene un único asiento de sueldo; releer o reintentar no repite cobros. El presupuesto permite saldo negativo si un sueldo supera lo disponible; los fichajes comprueban el saldo real. Las aportaciones de 2 M semanales siguen desde la entrada de cada participante.

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

Hasta 8 anuncios, 2 nuevos cada día de Madrid y máximo 7 días; si falta espacio se retiran los más antiguos. El mercado empieza al incorporarse el primer entrenador. Un futbolista tiene un único dueño dentro de cada liga y puede tener dueños distintos en otras ligas. Los valores combinan estadísticas y votos, conservando las subidas anteriores del 80 % y 30 %. Los administradores pueden fijar precios finales o restaurar el automático.

Búsqueda en todos los jugadores del club con foto, valor y puntos Fantasy. Favoritos privados: cuando aparece un anuncio se crea un aviso en la app y se envía push a los dispositivos vinculados al propietario. Se comprueba otra vez el dueño del token al entregar; con Fantasy cerrado solo reciben push dispositivos administradores. Al abrir se entra en Mercado, no en ajustes. Los avisos se deduplican por liga, usuario, futbolista y anuncio; la cola evita que avisos ya enviados bloqueen otros pendientes.

Una oferta enviada por participante, liga y día de Madrid, aunque después se rechace o cancele. Los reintentos de la misma oferta no consumen otra. Dura 7 días y no reserva fondos. Solo el vendedor acepta/rechaza y el comprador cancela. Al aceptar se comprueban propiedad, pertenencia, saldo, cupo semanal (2) y límites de ambas plantillas; traspaso y dinero se actualizan juntos.

## Sincronización y publicación

El cron actualiza el mercado una vez al día, liquida sueldos pendientes una vez por semana y entrega avisos de favoritos. Las actas se consultan por lotes pequeños, con lease, reintentos y backoff para fuentes sin cerrar. No se hacen consultas de Fantasy mientras no haya contratos. Los totales públicos se generan también en prepare:release-data mediante prepare-fantasy-sports.cjs. Las fotos existentes se reutilizan sin módulos nativos nuevos.

Las consultas repetidas tienen vías rápidas; los repartos, cobros y avisos se escriben por lotes para conservar los límites gratuitos de D1. Antes de desplegar se aplica fantasy-game-schema.sql tras las migraciones anteriores. No reinicia ligas, saldos, acceso ni votos. Los datos privados de contratos, plantillas, favoritos, transacciones y alineaciones quedan en CHAT_DB y no se incluyen en Git ni en el paquete público. Los datos públicos de actas sí se incluyen con sus pendientes. Las pruebas usan bases temporales y envíos push simulados, sin movimientos ni notificaciones ficticias en producción.
