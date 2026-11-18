// Frozen scope agreed for the next combined Villalbilla CF/Fantasy settings release.
// This catalog is a requirements checklist, NOT evidence that every feature exists yet.
// Each entry must have functional UI, server permissions and tests before being marked complete.
const groups=[
 {id:'leagues',label:'Ligas y competición',scope:'admin',items:[
  'Crear ligas nuevas','Reiniciar ligas','Pausar ligas','Eliminar o archivar ligas','Cambiar nombre de liga',
  'Límite de participantes','Ligas públicas o privadas','Temporadas','Duplicar configuración',
  'Inscripciones','Bloquear alineaciones','Jornadas especiales'
 ]},
 {id:'points',label:'Puntuaciones y premios',scope:'admin',items:[
  'Cambiar puntuaciones','Puntos desde una jornada','Historial de puntuaciones','Recalcular clasificación',
  'Premios económicos','MVP','Once ideal','Multiplicador del capitán','Puntos del entrenador',
  'Bonus y penalizaciones','Correcciones de actas','Clasificación histórica'
 ]},
 {id:'market',label:'Mercado y economía',scope:'admin',items:[
  'Presupuesto inicial','Límite de fichajes','Fechas del mercado','Cantidad de jugadores en mercado',
  'Precios manuales','Fórmula de precios','Cláusulas','Ofertas entre usuarios','Subastas',
  'Bloquear jugadores','Corregir fichajes','Premios y salarios','Préstamos de jugadores','Intercambios'
 ]},
 {id:'security',label:'Administración y seguridad',scope:'admin',items:[
  'Historial de cambios','Copias de seguridad','Gestión de participantes','Permisos por administrador',
  'Aprobar usuarios','Suspender usuarios','Modo mantenimiento','Estado del servidor',
  'Actividad reciente','Exportar datos','Cambios pendientes','Alertas de seguridad',
  'Segundo factor para administradores','Diagnóstico de la app'
 ]},
 {id:'account',label:'Mi cuenta y ajustes generales',scope:'user',items:[
  'Perfil y contraseña','Notificaciones personalizadas','Equipos favoritos','Actualizaciones',
  'Privacidad del perfil','Cerrar sesión en otros dispositivos','Reportar un problema',
  'Tutoriales','Accesibilidad','Preferencias de calendario','Avisos de partidos','Modo sin conexión'
 ]},
 {id:'appearance',label:'Apariencia',scope:'user',items:[
  'Tema oscuro, claro o automático','Pantalla de inicio','Vista de jugadores: tarjetas o lista'
 ]},
 {id:'club',label:'Club, entrenadores y jugadores',scope:'club',items:[
  'Gestión de equipos','Fichas de jugadores','Convocatorias','Asistencia','Permisos de padres',
  'Calendario del club','Noticias y publicaciones','Fotos del club','Chat de equipo','Estadísticas deportivas'
 ]}
];
const features=groups.flatMap(group=>group.items.map((label,index)=>({
 id:group.id+'-'+(index+1),group:group.id,label,scope:group.scope
})));
module.exports={groups,features};
