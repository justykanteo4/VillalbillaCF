# Villalbilla Fantasy · publicación del mercado, cláusulas y tres plataformas

## Reglas comprobables
- Cláusula base: 160 % del **precio de compra**, no del valor de mercado posterior.
- Cada millón gastado en ampliar añade dos millones de cláusula. Cada pago caduca de forma independiente tras dos jornadas.
- Un fichaje nuevo no puede recibir clausulazos hasta terminar dos jornadas.
- Los clausulazos se bloquean en las últimas 24 horas antes del cierre semanal.
- Compra por cláusula: operación única en D1 (justificante, oferta interna y traspaso con cobro/abono).
- Venta inmediata: 60 % del valor de mercado; no se permite cuando el jugador tiene una subasta activa.
- Venta en el mercado: el propietario elige precio mínimo; el jugador no abandona su plantilla hasta adjudicación; se respetan el mínimo 12 y máximo 16.
- Ligas actuales: cláusulas desactivadas hasta que el club las habilita.

## Antes de desplegar
1. Esperar a que la acción **Fantasy release checks (web Android iOS)** esté en verde en el último commit, no en un commit anterior.
2. Revisar `pnpm-lock.yaml`: está pendiente alinear dependencias agregadas a `package.json` (`expo-apple-authentication` y `three`). Regenerar con `pnpm install --lockfile-only --no-frozen-lockfile`, confirmar el lockfile y volver a ejecutar `pnpm install --frozen-lockfile`.
3. Ejecutar `pnpm run check:fantasy-clauses` y `pnpm exec expo export --platform all --output-dir work/verify-all-platforms`.
4. Migrar **D1 CHAT_DB de producción** antes de desplegar el Worker:
   ```bash
   pnpm exec wrangler d1 execute villalbilla-chats --remote --file fantasy-clause-schema.sql
   pnpm exec wrangler d1 execute villalbilla-chats --remote --file fantasy-manager-listings-schema.sql
   ```
   Requiere credenciales del propietario de Cloudflare. Estos comandos mutan la base real: realizarlos solo tras copia de seguridad y pruebas.
5. Probar con dos cuentas de una liga de ensayo: alta/baja de anuncios, pujas, subida de cláusula, expiración de la segunda jornada, pago forzoso, saldo de ambos, 12/16 jugadores y 24 h de bloqueo.
6. Publicar web con el procedimiento existente: `pnpm run deploy:cloudflare`. Publicar actualización Android únicamente tras comprobar runtime y la compatibilidad con la APK: `pnpm run publish:android-update`.
7. iOS está preparado para exportación y perfiles EAS; requiere acceso a Apple Developer, certificados, compilación firmada y pruebas en dispositivo para una futura publicación. No afirmar que está distribuida.

## Bloqueo de publicación
No publicar ni fusionar el PR #12 mientras fallen pruebas o no estén desplegadas las dos tablas D1 nuevas.
