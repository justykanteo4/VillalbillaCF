# Datos y novedades incluidos en cada versión

release-notes.json identifica cada actualización de la app y conserva sus novedades en español. Se consultan en Ajustes → Actualizar app; no hay pantalla adicional de novedades al iniciar ni botón Continuar. Una sincronización de jornada no cambia ese identificador.

scripts/prepare-release-data.cjs reúne calendarios de temporada, plantillas, técnicos, clasificaciones, sanciones, goleadores, campos, actas de partidos con resultado y acumulados de porteros/minutos de los 17 equipos. Los guarda en assets/offline/club.clubdata y genera bundled-data-manifest.json con los recuentos y pendientes de esa preparación. Las fotos oficiales también siguen incluidas como recursos de la app.

El script mantiene progreso y copias anteriores si una fuente falla. No inventa actas ni datos que no estén publicados. Solo incluye endpoints públicos permitidos: nunca perfiles, credenciales, asistencia, material privado, diagnósticos o espacios de equipo. Las actas y datos posteriores se completan con la sincronización normal. Las fotos y vídeos aportados por usuarios no se precargan en las actualizaciones.

Expo descarga el recurso público junto a la actualización compatible. ReleaseStartup lo prepara en segundo plano sin bloquear las pantallas. Solo lee el recurso si su identificador aún no está instalado. Las importaciones se serializan por recurso con las escrituras normales mediante copy-coordinator.cjs; conservan fechas, actas cerradas, registros existentes y copias locales más recientes. Los indicadores se escriben al final y el paquete solo se marca instalado al terminar todo. Si falla, registra la incidencia y reintenta al regresar o cada minuto mientras la app está activa. El guardado de datos públicos se espera antes de aplicar otra actualización, pero su fallo no bloquea permanentemente la app.

Las revisiones iniciales evitan interpretar datos incluidos como un cambio nuevo y descargarlos otra vez. Web usa CacheStorage cuando está disponible; Android emplea el almacenamiento local y los módulos expo-asset y expo-file-system existentes. No se cambia el runtime ni se añade un módulo nativo.

Antes de publicar: actualizar novedades, ejecutar npm run prepare:release-data y npm run check:release, completar pruebas y exportaciones. AGENTS.md conserva ese procedimiento. Las pruebas verifican datos permitidos, importación única, fechas, fallo de disco, reintento y escritura de datos nuevos concurrente con la importación.

Si la fuente va lenta durante una actualización de interfaz, RELEASE_REUSE_RECENT_DATA=1 permite reutilizar entradas consultadas hace menos de una hora. Conserva savedAt y collectedFor originales y las registra como reused en pendientes, sin presentarlas como una consulta nueva ni cerrar actas. Las entradas ausentes o antiguas siguen el proceso normal de consulta y respaldo.
