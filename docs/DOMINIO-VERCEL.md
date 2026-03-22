# Conectar `hechomadera.com` a Vercel (DNS en Hostinger)

## 1) En Vercel

1. Proyecto → **Settings** → **Domains**.
2. Añade **`hechomadera.com`** y **`www.hechomadera.com`** (recomendado redirigir `www` → apex o al revés según prefieras).
3. Vercel muestra los registros DNS que debes crear (normalmente **A** / **CNAME**).

## 2) En Hostinger (u otro DNS)

1. **hPanel** → dominio → **DNS / Zona DNS**.
2. Crea o edita los registros **exactamente** como indica Vercel (nombres, valores, TTL recomendado “Auto” o 3600).
3. Espera propagación (minutos a pocas horas). Puedes comprobar con `dig hechomadera.com` o herramientas online.

## 3) HTTPS

Vercel emite certificados **Let’s Encrypt** automáticamente cuando el DNS apunta bien.

## 4) Variables de entorno

Tras tener el dominio activo, en Vercel actualiza:

- `NEXT_PUBLIC_SITE_URL=https://hechomadera.com` (sin barra final)

y **Redeploy**.

## 5) Email (Resend)

Si el remitente es `info@hechomadera.com`, los registros **SPF/DKIM** suelen estar en el proveedor de correo o en Resend; no confundir con los DNS del sitio web salvo que Resend te pida un registro concreto en la misma zona.
