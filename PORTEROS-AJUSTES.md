# Ajustes de goles encajados

Aplicar `goalkeeper-adjustments-schema.sql` a CHAT_DB antes de desplegar el Worker. No modifica las actas ni los acumulados oficiales guardados. Se guarda un incremento o decremento por temporada, equipo y jugador, con versión y autor privado. El GET público solo publica equipo, jugador, ajuste, versión y fecha.

Los POST requieren una cuenta verificada y autorización en el servidor: administrador o entrenador aprobado asignado al equipo. Los jugadores, perfiles pendientes y entrenadores de otros equipos no pueden editar. Solo se admiten porteros del catálogo del equipo y cambios de +1 o −1. El control de versión evita que dos entrenadores sobrescriban un cambio y que un reintento se cuente dos veces. Un total negativo se rechaza.

Los controles están en Plantilla al desplegar la ficha de un portero y en Rankings → Porteros para los equipos autorizados. El ajuste se suma a los goles confirmados por actas; nuevas actas conservan el ajuste. Partidos y porterías a cero permanecen intactos: un ajuste de goles acumulados no identifica en qué partido se produjo el cambio.

La copia local de los ajustes se conserva para lectura sin conexión. Guardar requiere conexión y no muestra un cambio como confirmado hasta que lo acepta el servidor. El ranking del club recalcula el coeficiente con el total ajustado, manteniendo la exclusión de Benjamín y Prebenjamín y el desempate por más partidos. Las versiones de cada ajuste impiden que una respuesta antigua deshaga un guardado reciente.
