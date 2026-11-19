# Hito W5 · Pagos por lead y conexión con Operflow
> Diario del hito. Se agrega información; no se borra.

## 2026-11-18 / 2026-11-19
**Hecho**
- Cobros por lead con Mercado Pago, montos calculados en el servidor: diseño (precio fijo por producto de la tabla vigente) → anticipo (35% del valor final − diseño) → saldo (valor medido − todo lo pagado). Todo se cuenta como abonos NETOS (pagado − devuelto); cada cobro pide solo lo que falta. Fórmulas iguales en `lib/pagos/calcular.ts` y en la base (`monto_esperado`).
- Enlace de pago del cliente `/pago/lead/[token]` (código secreto de 64 caracteres por lead); botón "Pagar el diseño" al terminar el configurador. En la ficha del lead, bloque "Pagos": enlace para copiar, pagos, pago a mano y valor final (solo gerencia), "No aprobó", borrar cliente, estado de Operflow, "Se devolvió todo" / "Se queda (abono)".
- Órdenes de Redis a Supabase: tablas `ordenes` y `pagos` (`lib/pagos/ordenes.ts`). La tienda ya no acepta precios del navegador (usa `content/products.json`). Botón de gerencia "Copiar órdenes viejas" (Redis → Supabase, sin duplicar): NO se pudo ejecutar porque la web no se conecta a Upstash (fetch failed).
- Webhook de Mercado Pago: consulta el pago en la API de MP y la base decide (`registrar_pago`): monto y moneda, cobro vigente, repetidos, leads cerrados, pagos de prueba, devoluciones totales/parciales, reclamos. Correo a gerencia por todo pago para revisar (`avisarPagoParaRevisar`). En producción se ignoran pagos de prueba; fuera de producción solo gerencia inicia cobros (la vista previa comparte la base real); los leads creados fuera de producción son `es_prueba`. Los cobros vencen a las 24 h (también efectivo). Límite por IP en el webhook.
- Operflow: bandeja `mensajes_operflow` (A al pagar el diseño, C anticipo/saldo, E no aprobó); envío con reintentos (botón y tarea diaria en `vercel.json` → `/api/integraciones/reintentar` con `CRON_SECRET`), sin envíos dobles. Mensaje B firmado con HMAC en `/api/integraciones/operflow` (formato PROPUESTO por la web: `X-Operflow-Firma: t=…,v1=…`, por confirmar con Operflow; nota en la carpeta compartida de notas). O3 de Operflow no existe: todo queda pendiente hasta que se conecte.
- "No aprobó" (asesor del lead o gerencia) y "Borrar cliente" (gerencia): vencen los cobros abiertos en MP, borran fotos de la cubeta `fotos-espacio`, datos personales y notas; conservan los pagos. Con sesión nadie borra clientes ni leads directamente.
- Regla en la base: un lead pagado no vuelve a estado a mano; con sesión nadie cambia lo pagado ni lo de Operflow.
- Privacidad: el código del enlace no llega a Google Analytics, Vercel Analytics ni otros sitios; las rutas viejas de consulta de MP son solo de gerencia.
- Migraciones aplicadas en Supabase Hechomadera desde Chrome, cada una en begin/commit con huella SHA-1 y verificación de permisos: `20261118000900_w5_pagos`, `20261119000100_w5_refuerzo_pagos`, `…000200_w5_refuerzo_pagos_2`, `…000300_w5_abonos_netos`, `…000400_w5_devoluciones`, `…000500_w5_detalles_finales`. Respaldo previo `respaldos/2026-11-19-antes-w5-pagos.json`; etiqueta `respaldo-2026-11-19-w5-pagos` (subida).
- Pruebas: 293 (23 archivos), lint y build sin errores. Validador: 5 pasadas; la 5ª sin caminos de pérdida de plata (solo detalles menores, corregidos en la migración 0500). Auditor sin desviaciones graves.
- Vista previa probada: página de pago y rutas protegidas (503/401/403/404 esperados). NO probado: un pago real de prueba en Mercado Pago (falta credencial de prueba).
- Lead real 4DAF4A75 sin cambios (Contactado, nada pagado). Vercel solo lectura; Upstash sin conexión (consola pide sesión, no se entró). Barra del Code tab reorganizada ("Hechomadera web" y "Operflow") a pedido de Alberto.

**Aprendido**
- Pedido de Alberto: "no podemos arriesgar ni un peso". Lo que decide si un pago cuenta debe ser la base (recalcula todo), no la pantalla ni el aviso de MP; cinco pasadas del validador fueron necesarias para llegar a cero caminos de pérdida.
- Contar abonos netos (pagado − devuelto) simplifica devoluciones parciales y reclamos.
- `MERCADOPAGO_ACCESS_TOKEN` es la misma en todos los entornos de Vercel: la vista previa usa la credencial real. Por eso se bloquean cobros fuera de producción salvo gerencia.
- La web no se conecta a Upstash (fetch failed): también afecta los límites de intentos.

**Pendientes**
1. Alberto: credencial de PRUEBA de Mercado Pago solo para Preview en Vercel; luego un pago de prueba con comprador de prueba.
2. Alberto: revisar Upstash Redis (no responde: sin límites de intentos y sin copia de órdenes viejas).
3. Alberto: crear `CRON_SECRET` en Vercel; cuando exista O3: `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET` y confirmar el formato de firma.
4. Recomendado: `MERCADOPAGO_WEBHOOK_ENFORCE=true` en producción.
5. Alberto: cerrar la pestaña del SQL Editor de Supabase (quedó vacía, pide confirmar): descartar.
6. Siguen: `SUPABASE_SECRET_KEY` tipo Secret, precios reales, abogado (Ley 1581, privacidad y términos con la regla de diseño no reembolsable), página de invitación y asesor real, pasar a `main` con visto bueno.

**Commits del hito (hito-4..HEAD):**
- bc9bd91 feat: cobros por lead con Mercado Pago, órdenes en Supabase y bandeja a Operflow
- cb8f7e7 feat: pagos en la ficha del lead, enlace de pago del cliente, no aprobó y borrar cliente con sus fotos
- 5058dc5 feat: botón de gerencia para copiar las órdenes viejas de Redis a Supabase sin duplicar
- d804c97 fix: el botón de copiar Redis muestra el motivo del error
- 0421678 fix: refuerzo de seguridad de pagos tras revisión detallada
- 2428be0 fix: segundo refuerzo de pagos tras la segunda pasada del validador
- 5737d5b fix: abonos netos y resolver pagos sin volver a cobrar
- 9d5bc8b fix: devoluciones de pagos que ya contaban y saldo recobrable
- 2bf0674 fix: detalles finales de pagos (quinta pasada del validador, sin riesgo de plata)
