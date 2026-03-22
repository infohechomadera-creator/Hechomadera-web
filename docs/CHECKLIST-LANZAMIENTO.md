# Checklist de lanzamiento (Hechomadera)

Usar antes de cutover DNS o campañas pagadas.

## Vercel y entorno

- [ ] `NEXT_PUBLIC_SITE_URL` = URL pública final (sin `/` final).
- [ ] `MERCADOPAGO_ACCESS_TOKEN` = credencial correcta (prueba vs producción).
- [ ] `NEXT_PUBLIC_WHATSAPP_PHONE` = número Colombia, solo dígitos.
- [ ] **Resend (opcional):** `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `RESEND_FROM` (dominio verificado).
- [ ] Último deploy **Ready** y prueba en móvil.

## Contenido

- [ ] `content/products.json` con productos reales (o ocultar tienda hasta tenerlos).
- [ ] Revisar textos legales (`/legal/*`) con asesoría — sustituir borradores.
- [ ] Fotos en **Inspiración**: sustituir placeholders por obra propia si aplica.

## Dominio

- [ ] Dominio añadido en Vercel + DNS en Hostinger (`docs/DOMINIO-VERCEL.md`).
- [ ] Tras propagación, actualizar `NEXT_PUBLIC_SITE_URL` y redeploy.
- [ ] Mercado Pago: URLs de retorno y webhook apuntan al dominio final.

## SEO técnico

- [ ] `/sitemap.xml` y `/robots.txt` accesibles en producción.
- [ ] Si las páginas legales pasan a indexables, quitar `noindex` en metadata y valorar incluirlas en `app/sitemap.ts`.

## Post-lanzamiento

- [ ] Webhook MP: pasar de logs a conciliación de pedidos cuando exista backend o herramienta.
- [ ] Cookies no esenciales / píxeles: actualizar política de cookies y banner si se activan.
