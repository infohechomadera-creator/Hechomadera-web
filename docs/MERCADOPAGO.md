# Mercado Pago (Checkout Pro) — pasos

## 1) Credenciales

1. Entra a **https://www.mercadopago.com.co** con tu cuenta de vendedor.
2. **Tus integraciones** → tu aplicación → **Credenciales**.
3. Copia el **Access Token** (usa **credenciales de prueba** primero; luego producción).

## 2) Variables en Vercel

| Variable | Valor |
|----------|--------|
| `MERCADOPAGO_ACCESS_TOKEN` | El token (secreto; solo servidor). |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio, ej. `https://tu-proyecto.vercel.app` (sin barra final). |
| `ENABLE_PAYMENT_TEST_PAGE` | Opcional. En **producción**, la ruta **`/pago/prueba`** está **oculta** (404) salvo que pongas `true`. En local siempre visible. |

**Redeploy** tras guardar.

## 3) Probar en la web

1. En **producción**, si necesitas la página de prueba, añade `ENABLE_PAYMENT_TEST_PAGE=true` en Vercel y redeploy. Abre **`/pago/prueba`** en tu dominio.
2. Pulsa **Pagar con Mercado Pago** → debe abrir el checkout de Mercado Pago.
3. Con credenciales de **prueba**, usa tarjetas de prueba de la documentación de MP.

## 4) Referencia externa (opcional)

La API de preferencias ahora genera un `order_id` propio y lo usa como `external_reference` en Mercado Pago. Esto facilita consultar estado por orden aunque no retorne `payment_id` en el navegador.

Si el cliente envía `external_reference` en el request, se conserva como `source_reference` en la respuesta de la API (útil para trazabilidad).

## 5) URLs de retorno

La API crea preferencias con `back_urls` hacia:

- `/pago/resultado?estado=aprobado` (éxito)
- `/pago/resultado?estado=rechazado`
- `/pago/resultado?estado=pendiente`

Mercado Pago puede agregar parámetros como `payment_id` / `collection_id`. Además, las `back_urls` incluyen `order_id` para que `/pago/resultado` pueda consultar estado por orden.

## 6) Webhooks

1. URL de notificación en el panel de Mercado Pago (misma base que el sitio):

   `https://TU_DOMINIO/api/payments/mercadopago/webhook`

2. La ruta **`POST /api/payments/mercadopago/webhook`** ya responde `200` y deja el cuerpo en **logs de Vercel** (Functions). Falta, cuando tengas pedidos en base de datos: validar firma, consultar el pago por API y marcar el pedido como pagado.

3. Variable opcional (según evolución de la integración): `MERCADOPAGO_WEBHOOK_SECRET` — documentar en MP si aplica a tu flujo.

## 7) Consultar pago por ID (API interna)

Endpoint disponible para depurar estado real:

- `GET /api/payments/mercadopago/payment/{paymentId}`
- `GET /api/payments/mercadopago/reference/{externalReference}`
- `GET /api/payments/orders/{orderId}`

Devuelve estado técnico de MP, estado normalizado (`approved`/`pending`/`rejected`) y referencia externa.

## 8) Abonos del 35% (proyectos)

Misma API de preferencias: `unit_price` = monto del abono calculado en servidor según tu regla de negocio (no hardcodear en cliente).

## 9) Debug de eventos webhook (temporal)

Existe endpoint protegido para inspección rápida de eventos webhook en memoria:

- `GET /api/payments/webhook-events?limit=20&token=TU_TOKEN`

Requiere variable de entorno:

- `DEBUG_WEBHOOK_TOKEN` (Vercel / .env.local)
- Opcional para persistencia entre invocaciones serverless: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`

También acepta header `x-debug-token`. Sin Redis, usa buffer en memoria (puede vaciarse entre invocaciones).
