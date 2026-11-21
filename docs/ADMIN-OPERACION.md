# Admin MVP (backend) — órdenes y exportes

Endpoints internos para operación. Desde W1 (2026-11-18) se entra con **usuario y contraseña de Supabase** en `/admin/login`; solo el rol **gerencia** ve órdenes. Ya no se usan `ADMIN_API_TOKEN` ni `ADMIN_PASSWORD`.

## Quién entra
- **Gerencia:** órdenes, detalle, exportar CSV y `/pago/prueba`.
- **Asesor:** aún sin acceso a órdenes (su panel de leads llega en W4).
- Usuarios nuevos: los crea gerencia en Supabase → Authentication → Add user, y se les asigna rol en `public.perfiles`. El registro libre está desactivado.

## Variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (persistencia de órdenes)

## Endpoints (con sesión de gerencia)
- `GET /api/admin/orders?limit=50&status=approved` — lista órdenes (filtro opcional por estado).
- `GET /api/admin/orders/{orderId}` — detalle de una orden.
- `GET /api/admin/orders/export?limit=500` — export CSV.
- Sin sesión responden 401. La revisión se hace dos veces: en el middleware y dentro de cada API.

## Vista mínima de operación
- `/admin` — listado de órdenes con filtros y enlace a export CSV.
- `/admin/orders/{orderId}` — detalle de una orden.

## Diagnóstico
- `/api/salud` (no disponible en producción): dice si Supabase está conectado y de dónde salen los precios. No muestra llaves.

## Notas
- Las órdenes se crean al generar preferencia en `/api/payments/mercadopago/preference`.
- El webhook intenta actualizar orden por `external_reference` (que ahora es `order_id`).
- Si Redis no está disponible, hace fallback a memoria (útil para dev, no ideal para operación real).
