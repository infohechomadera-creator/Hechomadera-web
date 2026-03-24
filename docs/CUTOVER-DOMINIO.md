# Cutover de dominio: hechomadera.com

Guía para el día en que apuntas el DNS real. Seguir en orden — cada paso depende del anterior.

---

## Antes de empezar (checklist previo)

- [ ] El sitio en Vercel (staging) carga bien en móvil y desktop
- [ ] El formulario de contacto envía correo (o al menos no da error)
- [ ] Mercado Pago tiene un token listo (prueba o producción)
- [ ] Tienes acceso a Hostinger (hPanel) en otra pestaña
- [ ] Tienes acceso al dashboard de Vercel en otra pestaña
- [ ] **Hiciste un respaldo del WordPress actual en Hostinger** (por si necesitas rollback)

---

## Paso 1 — Agregar el dominio en Vercel

1. Entra a **vercel.com** → tu proyecto `hechomadera`
2. **Settings → Domains → Add**
3. Agrega `hechomadera.com` → Vercel muestra los registros DNS a crear
4. Agrega también `www.hechomadera.com` → configura para redirigir al apex (`hechomadera.com`)
5. **Anota los registros DNS que Vercel te muestra** (los necesitas en el paso 2)

Típicamente Vercel pide:
```
Tipo    Nombre    Valor
A       @         76.76.21.21
CNAME   www       cname.vercel-dns.com
```
*(los valores exactos los muestra Vercel — úsalos tal como aparecen)*

---

## Paso 2 — Apuntar DNS en Hostinger

1. Entra a **hPanel** (hostinger.com) → tu cuenta → **Dominios → hechomadera.com**
2. Ve a **DNS / Zona DNS**
3. Edita (o crea) los registros exactamente como Vercel indicó en el paso 1
4. Guarda los cambios
5. Espera propagación: **entre 15 minutos y 2 horas**

Para verificar propagación:
```bash
dig hechomadera.com A
# o en el navegador: dnschecker.org → hechomadera.com
```
Cuando el resultado apunte a la IP de Vercel, continúa.

---

## Paso 3 — Actualizar variables de entorno en Vercel

Una vez que el dominio propague, en Vercel:

**Settings → Environment Variables** → actualiza o crea:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://hechomadera.com` |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | `57XXXXXXXXXX` (tu número) |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de producción (APP_USR-...) |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave del webhook MP |
| `MERCADOPAGO_WEBHOOK_ENFORCE` | `true` |
| `RESEND_API_KEY` | Tu API key de Resend |
| `CONTACT_TO_EMAIL` | `infohechomadera@gmail.com` |
| `RESEND_FROM` | `Hechomadera <info@hechomadera.com>` |
| `UPSTASH_REDIS_REST_URL` | URL de tu base Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token Redis |
| `ADMIN_API_TOKEN` | Token seguro para el panel admin |

Luego haz **Redeploy** desde el dashboard (sin push):
Deployments → el último deploy → los tres puntos → **Redeploy**

---

## Paso 4 — Actualizar webhook en Mercado Pago

1. Entra a **mercadopago.com.co** → Tus integraciones → Webhooks
2. Cambia la URL de notificación a:
   ```
   https://hechomadera.com/api/payments/mercadopago/webhook
   ```
3. Guarda y haz una notificación de prueba desde MP
4. Verifica en Vercel → Functions → Logs que llegó el evento

Las URLs de retorno al comprador (success/failure/pending) se generan automáticamente desde `NEXT_PUBLIC_SITE_URL`, así que quedan correctas con el paso 3.

---

## Paso 5 — Verificar dominio en Resend (para email `info@hechomadera.com`)

1. Entra a **resend.com** → Domains → Add Domain → `hechomadera.com`
2. Resend te da registros SPF/DKIM para añadir en Hostinger DNS:

```
Tipo    Nombre                Valor
TXT     @                     v=spf1 include:resend.com ~all
TXT     resend._domainkey     (clave DKIM que da Resend)
```

3. Vuelve a Hostinger → DNS → agrega esos registros
4. En Resend haz clic en **Verify** — puede tardar unos minutos

---

## Paso 6 — Verificación final

Abre `https://hechomadera.com` y comprueba:

- [ ] Carga con HTTPS (candado verde) — Vercel emite Let's Encrypt automáticamente
- [ ] `www.hechomadera.com` redirige al apex
- [ ] `/sitemap.xml` devuelve URLs con `hechomadera.com`
- [ ] `/robots.txt` muestra `Sitemap: https://hechomadera.com/sitemap.xml`
- [ ] Formulario de contacto envía correo a tu Gmail
- [ ] Botón de pago redirige a Mercado Pago (checkout real)
- [ ] Panel admin carga en `/admin` (protegido con token)

---

## Rollback de emergencia

Si algo falla, puedes revertir el DNS en Hostinger apuntando de vuelta al servidor anterior.
El WordPress sigue intacto hasta que decidas eliminarlo.

---

## Después del lanzamiento

- Activar Google Search Console con el dominio real y subir el sitemap
- Confirmar que Analytics / píxeles (si los hay) apuntan al dominio correcto
- Cambiar `MERCADOPAGO_WEBHOOK_ENFORCE=true` si aún no lo hiciste
