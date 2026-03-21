# Migración Hechomadera: WordPress + Hostinger → Next.js + Vercel

## Objetivos del negocio (recordatorio)

- **Conversión:** agendar reunión, comprar en marketplace, WhatsApp, formularios de cotización.
- **Público:** Colombia, estratos 3–6, móvil primero, estética minimalista premium (blanco/negro + tipografía clara).
- **Modelo comercial:**
  - **Marketplace:** precio fijo COP, pago 100% online, envío **no** incluido por defecto.
  - **Proyectos:** “precio desde”, abono **35%** por defecto (configurable), saldo web o con asesor, envío incluido en proyectos.
- **Pagos:** Mercado Pago — **integración manual** (credenciales, webhooks, prueba vs producción).
- **Legal:** términos, privacidad, cookies — texto final **manual**.
- **Catálogo:** ~40 productos — datos en `content/products.json` (o CMS después).

## Respaldo WordPress / Hostinger (no renunciar al dominio)

1. **Hostinger → Copias de seguridad:** confirmar respaldo reciente (automático + manual si aplica).
2. **UpdraftPlus** (si sigue activo): descargar copia a almacenamiento externo opcional.
3. **Exportar:** `Herramientas → Exportar` en WordPress (contenido XML) como refuerzo.
4. **No eliminar** el sitio WordPress hasta que **Next+Vercel** esté en producción y validado (dual-track).

El dominio **hechomadera.com** sigue siendo suyo; solo cambiará el **DNS** apuntando a Vercel cuando hagan cutover.

## Qué hace el agente (Cursor) vs qué es manual

| Agente (repo) | Manual (usted / especialista) |
|----------------|--------------------------------|
| UI, layout, tipografía, colores, botones, páginas, copy base | Credenciales Mercado Pago, webhooks, DNS |
| `content/products.json`, estructura de rutas | Textos legales definitivos |
| Componentes, responsive, SEO técnico básico en código | Meta Pixel / Google Ads con consentimiento |
| Placeholders formulario / checkout | Email transaccional, CRM, agenda Google real |

## Próximos pasos prácticos

1. En la carpeta del proyecto: `npm install` y `npm run dev`.
2. Crear repo GitHub y conectar **Vercel**.
3. Añadir `NEXT_PUBLIC_WHATSAPP_PHONE` y `NEXT_PUBLIC_SITE_URL` en Vercel (variables de entorno).
4. Importar los ~40 productos al JSON o script de importación.
5. Implementar checkout Mercado Pago en rutas API cuando las credenciales estén listas.

## Rollback

Si la nueva versión falla: revertir DNS a Hostinger o apuntar a un subdominio `old.hechomadera.com` con WordPress.
