# Actualización automática

InternetUpdates.native.js comprueba al arrancar y al volver a primer plano, y cada cinco minutos mientras la app está activa. Usa Expo Updates para mejoras compatibles con el APK instalado. Tras descargar muestra un aviso dentro de la app y una cuenta atrás de 15 segundos, y aplica la actualización con reloadAsync sin pedir una pulsación. Una descarga pendiente del arranque nativo se trata igual.

No reinicia en segundo plano. Al volver a primer plano recupera el plazo de aviso. Si el teclado está abierto o useTeamWorkspace está guardando, espera y vuelve a dar el plazo. update-save-guard.cjs rastrea escrituras locales y bloquea reinicio automático si una falla, hasta una escritura correcta. No promete conservar borradores de formularios no enviados: protege los cambios del vestuario que ya se guardan automáticamente. La sincronización con la nube puede completarse después de recuperar conexión; no se exige red para conservar cambios locales.

Sin conexión o si falla la descarga conserva la versión instalada. Una aplicación fallida de la actualización se reintenta más tarde. Cada consulta está protegida frente a ejecuciones simultáneas. La cuenta atrás se muestra en una ventana sobre la pantalla actual, también sobre la vista del simulador, sin requerir confirmación. El botón manual sigue disponible.

Este mecanismo no instala APKs ni módulos nativos nuevos. La primera activación requiere recibir esta OTA con el comportamiento previo o pulsar Actualizar app una vez.

Validación: pruebas del arranque, periodicidad sin cerrar app, aviso/plazo, fallo de descarga, espera por teclado/escrituras, pausa en segundo plano y guardado local fallido. Aplicación/reinicio reales pendientes de confirmar en teléfono Android.
