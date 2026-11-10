# Avisos privados de votaciones

Aplicar `vote-notifications-schema.sql` a CHAT_DB después de `social-schema.sql` antes de desplegar el Worker. Es una migración repetible: no crea avisos de votos anteriores. Los triggers guardan un evento en la misma transacción de cada elección nueva o cambio de candidato; repetir la misma elección y retirar un voto no generan eventos.

`dispatchVoteNotifications` usa exclusivamente los dispositivos de administrador registrados en VISITS_DB por el endpoint autenticado `/api/access/admin-push`. Comprueba de nuevo la asociación de cuenta y el estado activo antes de enviar. No publica la identidad del votante ni el candidato elegido. La notificación abre Votaciones mediante el destino público ya soportado por las APK.

El envío se intenta en segundo plano al votar y se recupera desde el cron de cada minuto, con lotes de cinco en paralelo, hasta cinco intentos y bloqueo temporal de trabajos. Se reintenta después de un minuto si falla el proveedor; un token no registrado se desactiva. Una aceptación de Expo confirma la recepción por el proveedor, no la visualización en el teléfono. Un fallo de red ambiguo tras aceptar Expo podría producir una repetición, como en otros avisos push.

Solo se encolan eventos de las últimas 24 horas y se conservan eventos/trabajos siete días. Los avisos privados no consumen el cupo de publicaciones generales del club. No es necesario instalar una nueva APK para esta función.
