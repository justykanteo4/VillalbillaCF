# Publicar actualizaciones de Villalbilla CF

Para cada actualización con cambios de la app, cambia el identificador y las novedades en `release-notes.json`. Escribe en español qué añadió o modificó esa versión. Ese identificador controla la pantalla de novedades y su botón Continuar; no lo cambies por una simple sincronización de jornada.

Antes de publicar, ejecuta `npm run prepare:release-data` y `npm run check:release`. La copia pública se incluye como recurso `assets/offline/club.clubdata`, con su manifiesto `bundled-data-manifest.json`. Reutiliza los datos anteriores si una fuente falla e informa de pendientes; no inventes actas ni marques una copia incompleta como completa. No incluyas perfiles, credenciales, mensajes privados, asistencia o espacios de entrenadores en ese archivo.

No sobrescribas en la importación copias locales más recientes ni datos privados del equipo. Conserva los controles de acceso. Ejecuta las pruebas y las exportaciones apropiadas antes de publicar. Mantén los runtimes Android verificados 0.1.11 y 0.1.12 mientras no se añadan módulos nativos.

Wrangler debe conservar `assets.run_worker_first` para `/api/*` y `/downloads/*`. Mantén la preparación de la descarga del APK y despliega con `--keep-vars`.
