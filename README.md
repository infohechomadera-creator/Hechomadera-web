# Hechomadera — Next.js (migración desde WordPress)

Sitio orientado a **máximo prompt → visual** (código en Git + deploy en Vercel).

## Requisitos

- Node.js 20+ ([nodejs.org](https://nodejs.org))
- Cuenta [Vercel](https://vercel.com) y GitHub/GitLab

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Editar .env.local: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_WHATSAPP_PHONE
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — producción
- `npm run start` — servir build local
- `npm run lint` — ESLint

## Estructura útil

- `app/` — rutas y páginas (App Router)
- `components/` — UI reutilizable
- `content/products.json` — catálogo marketplace (~40 ítems)
- `lib/site-config.ts` — navegación, ciudades, reglas de negocio en código
- `docs/MIGRACION.md` — respaldo WP, manual vs agente
- `docs/CHECKLIST-LANZAMIENTO.md` — variables, dominio, legal, SEO antes del cutover
- `app/sitemap.ts` / `app/robots.txt` — SEO técnico (usa `NEXT_PUBLIC_SITE_URL`)

## Despliegue

1. Conecta el repo a Vercel.
2. Variables: ver `.env.example`.
3. **Banner promocional (opcional):** en Vercel añade `NEXT_PUBLIC_PROMO_ENABLED=true`, `NEXT_PUBLIC_PROMO_TEXT=Tu mensaje`, opcional `NEXT_PUBLIC_PROMO_LINK=/tienda` y redeploy.
4. Dominio: `hechomadera.com` en Vercel → **`docs/DOMINIO-VERCEL.md`** (DNS en Hostinger).

**WordPress en Hostinger** se mantiene como respaldo hasta el cutover definitivo.

## Siguiente desarrollo (prioridad sugerida)

1. Conectar dominio `hechomadera.com` → **`docs/DOMINIO-VERCEL.md`**.
2. **Mercado Pago:** `docs/MERCADOPAGO.md` — token en Vercel; **`/pago/prueba`** en producción solo con `ENABLE_PAYMENT_TEST_PAGE=true`; webhook en **`/api/payments/mercadopago/webhook`**.
3. Catálogo: edita `content/products.json` (hay un producto de ejemplo); cada ítem enlaza a `/tienda/[slug]` con botón Mercado Pago.
