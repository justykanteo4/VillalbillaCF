# Actualización silenciosa

InternetUpdates.native.js comprueba al arrancar, al volver a primer plano y cada cinco minutos mientras la app está activa. Descarga las mejoras compatibles y todos sus recursos, incluido el paquete público de actas y datos, sin mostrar banners, progreso ni cuentas atrás. Una descarga pendiente del arranque nativo sigue el mismo flujo.

Solo cuando la descarga termina, el teclado está cerrado y han finalizado los guardados locales, aparece el único aviso «Actualización obligatoria». No se puede cerrar ni aplazar: el botón «Actualizar» aplica el paquete y reinicia. No hay un reinicio temporizado. Si falla la aplicación, el mismo aviso permite reintentar. Buscar actualizaciones en Ajustes usa el mismo controlador y no crea otro flujo de descarga o reinicio.

No se reinicia en segundo plano. Si la descarga termina con la app inactiva, el aviso espera al regreso. Android o iOS pueden pausar la ejecución al cerrar la app; no se promete descargar con el proceso terminado. Se comprueba de nuevo al regresar. No se añaden permisos ni servicios nativos de ejecución permanente.

update-save-guard.cjs protege las escrituras locales que ya se guardan automáticamente. La aplicación se vuelve a comprobar después de finishLocalSaves. Una escritura privada fallida impide reiniciar hasta corregirla. No se garantiza conservar borradores no enviados. La sincronización con la nube continúa al recuperar conexión.

La preparación del paquete público ocurre sin pantalla de novedades ni botón Continuar y se serializa con las escrituras de caché para conservar datos más recientes. Un fallo de datos públicos se registra y reintenta sin bloquear permanentemente una actualización de la app. Las novedades siguen disponibles en Ajustes → Actualizar app.

Sin conexión o si falla la descarga se conserva la versión instalada. Este mecanismo aplica actualizaciones Expo compatibles; no instala APKs ni módulos nativos nuevos. Recibir esta primera versión requiere el flujo anterior de actualización. El comportamiento nuevo se usa desde entonces.

Validación: pruebas de descarga silenciosa, ausencia de reinicio sin pulsación, primer plano, teclado, escrituras pendientes/fallidas, reintento, consultas simultáneas, periodicidad, respuesta sin paquete nuevo y caché concurrente. Las pruebas de interfaz usan Expo simulado; no equivalen a comprobar el reinicio en un teléfono físico.
