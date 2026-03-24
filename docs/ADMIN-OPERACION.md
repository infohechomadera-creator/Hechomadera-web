# Admin MVP (backend) — órdenes y exportes

Endpoints internos para operación. Requieren `ADMIN_API_TOKEN` (query `?token=` o header `x-admin-token`).

## Variables

- `ADMIN_API_TOKEN` (obligatoria para estas rutas)
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (recomendado para persistencia)

## Endpoints

- `GET /api/admin/orders?limit=50&status=approved&token=...`
  - Lista órdenes guardadas (filtro opcional por estado).
- `GET /api/admin/orders/{orderId}?token=...`
  - Detalle de una orden.
- `GET /api/admin/orders/export?limit=500&token=...`
  - Export CSV para análisis externo.

## Notas

- Las órdenes se crean al generar preferencia en `/api/payments/mercadopago/preference`.
- El webhook intenta actualizar orden por `external_reference` (que ahora es `order_id`).
- Si Redis no está disponible, hace fallback a memoria (útil para dev, no ideal para operación real).
