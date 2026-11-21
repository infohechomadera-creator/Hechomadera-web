# Hito W2 · Catálogo y rango de precio
> Diario del hito. Se agrega información; no se borra.

## 2026-11-18
**Hecho**
- Adelantos del mismo día (ver `hito-1.md`): motor de precios `lib/precios/`, semilla, página `/cocinas` con 20 escenas y precios leídos de Supabase.
- Migración `20261118000400_w2_versiones_y_registro.sql` (aplicada en Supabase y verificada): varias versiones de precios el mismo día (manda la más reciente); tabla `eventos_integracion` (solo gerencia lee, solo el servidor escribe).
- Editor de precios `/admin/precios` (solo gerencia): metro lineal por diseño, isla, colores, herrajes, valor del diseño por producto, margen, redondeo, anticipo y fecha de vigencia (hoy o futura). Cada guardado crea una versión nueva a nombre de quien guarda; historial visible. Muestra un rango de ejemplo en vivo. Al guardar se regenera `/cocinas`.
- Mensaje D del contrato: `GET /api/integraciones/precios?ciudad=…` con `Authorization: Bearer OPERFLOW_API_KEY` (comparación en tiempo constante), límite de 60 solicitudes por minuto (Redis), registro de cada llamada sin la clave, respuesta con `version_id` y `vigente_desde`.
- Pruebas: 72 (permisos de versiones y registro, API de Operflow con base simulada, editor dibujado en servidor).

**Pendientes**
- Alberto: probar el editor guardando un cambio real.
- `OPERFLOW_API_KEY` en Vercel cuando Operflow la genere.
- Renders reales para las 20 escenas y los 5 diseños definitivos.

## 2026-11-18 (auditoría)
- Auditor (subagente con `.claude/agents/auditor.md`): sin secretos ni fugas graves. Corregido: registro de acciones externas en DECISIONES; contradicción de CLAUDE.md sobre la sesión de Alberto; `/api/salud` ya no devuelve mensajes de error; PGlite fijado a 0.5.15 y vitest a 3.2.7 exactos; URL de vistas previas acotada en Supabase.
- Pendiente del auditor: `SUPABASE_SECRET_KEY` como Secret en Vercel (Alberto) antes de pasar a `main`; `/cierre` y sesión nueva.
- Hallazgo: en `localhost:3000` hay una cookie de otro proyecto de Supabase (`hahrzpgnqmtpprfgytkn`, probablemente otra app local en el mismo puerto). No afecta a esta web, pero conviene no correr dos apps en el mismo puerto.

## 2026-11-18 (prueba real del editor)
- Claude guardó desde el navegador integrado (sesión abierta por Alberto) una versión de prueba: Barranquilla, D1 Moderno liso de $1.900.000 a **$2.000.000** (valor genérico; Alberto lo cambia después). Historial: versión a nombre de "Alberto", 11:07. `/cocinas` pasó de "desde $5.000.000" a "desde $5.250.000" en la cocina lineal Moderno liso (3 m × 2.000.000 − 12%, redondeado). Funciona de punta a punta.
- Aprendido: Alberto inicia sesión en el navegador integrado de la app, no en Chrome; la sesión de uno no sirve en el otro.
- Detalle menor: tras guardar, el botón queda en "Guardando..." unos segundos mientras se refresca la página.
