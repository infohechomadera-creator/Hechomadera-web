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

**Redeploy** tras guardar.

## 3) Probar en la web

1. Abre **`/pago/prueba`** en tu dominio Vercel.
2. Pulsa **Pagar con Mercado Pago** → debe abrir el checkout de Mercado Pago.
3. Con credenciales de **prueba**, usa tarjetas de prueba de la documentación de MP.

## 4) URLs de retorno

La API crea preferencias con `back_urls` hacia:

- `/pago/resultado?estado=aprobado` (éxito)
- `/pago/resultado?estado=rechazado`
- `/pago/resultado?estado=pendiente`

(Ajustar luego según parámetros reales que envíe MP en la query.)

## 5) Webhooks (siguiente fase)

Para comprobantes y pedidos confirmados en servidor, configurar **notificaciones IPN / webhooks** en el panel de Mercado Pago apuntando a una ruta API en este proyecto (pendiente de implementar).

## 6) Abonos del 35% (proyectos)

Misma API de preferencias: `unit_price` = monto del abono calculado en servidor según tu regla de negocio (no hardcodear en cliente).
