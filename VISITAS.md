# Visitas de APK y web

El total compartido cuenta aperturas, no usuarios únicos: arrancar la APK, abrir o recargar la web y regresar de segundo plano suman una visita cada vez. No hay un plazo mínimo de treinta minutos. La navegación interna, montar el contador, consultar el total y una interrupción nativa de permisos (`inactive`) no suman. Un ciclo `background` → `active` suma una vez aunque se repita `active`.

Cada entrada recibe un ID aleatorio, sin correo, usuario ni identificador permanente del dispositivo. Se persiste antes del envío. Los lotes se reintentan con los mismos IDs; un acuse perdido no repite la suma. Las visitas sin conexión se envían al recuperar conexión en una nueva entrada o al reintentar la cola. El inicio es único por ejecución aunque React monte de nuevo el componente.

En web, las entradas pendientes se guardan por ID en claves separadas de AsyncStorage. Dos pestañas pueden escribir y confirmar eventos simultáneamente sin sobrescribir la cola de la otra. Una recarga conserva los eventos pendientes y añade la nueva apertura. La APK conserva su cola anterior, sin perder visitas guardadas antes de actualizar.

`visit-web-schema.sql` se aplica a VISITS_DB antes del despliegue. Añade una tabla para eventos web y un trigger que incrementa el total histórico `apk_visit_totals`; no reemplaza ni reinicia las tablas anteriores. `visit-schema.sql` incluye ambas plataformas para nuevas instalaciones. El servidor deduplica IDs entre las tablas, acepta Android/iOS/web y sigue rechazando orígenes ajenos. Leer el contador no genera visitas. Las pruebas usan SQLite temporal y no envían aperturas ficticias a producción.
