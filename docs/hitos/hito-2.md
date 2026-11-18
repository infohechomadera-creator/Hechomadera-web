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
