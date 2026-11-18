# Referencia de Hechomadera-web
> Datos técnicos estables. Sin contraseñas ni llaves.

## Cuentas y servicios (de esta web)
| Servicio | Uso | Estado |
| --- | --- | --- |
| GitHub `infohechomadera-creator/Hechomadera-web` | Código | Activo |
| Vercel | Hosting; dominio `hechomadera.com` (staging `stg.hechomadera.com`) | Activo |
| Mercado Pago | Checkout Pro; webhook `/api/payments/mercadopago/webhook` | Producción |
| Resend | Correo de contacto y avisos al cliente; dominio verificado | Activo |
| Upstash Redis | Órdenes de la tienda y eventos del webhook | Activo |
| Vercel Analytics | Métricas básicas | Activo |
| Supabase (de la web) | Leads, CRM, usuarios, fotos, precios | **Por crear en W1** (lo crea Alberto) |
| API de Anthropic | Agente de IA | **Por crear en W6** (tope de gasto aprobado) |

## Variables de entorno (solo nombres; ver `.env.example`)
- Sitio: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_PHONE`, `NEXT_PUBLIC_PROMO_*`.
- Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_WEBHOOK_ENFORCE`, `ENABLE_PAYMENT_TEST_PAGE`, `DEBUG_WEBHOOK_TOKEN`.
- Resend: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `RESEND_FROM`.
- Redis: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Admin: `ADMIN_API_TOKEN` (se reemplaza por usuarios en W1).
- Futuras (contrato): `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET`; Supabase en W1.

## Dónde está cada cosa en el código
- Reglas de negocio: `lib/site-config.ts` (ciudades, marketplace, "precio desde", abono 35%).
- Catálogo: `content/products.json`.
- Contacto: `POST /api/contact` (Resend).
- Admin: `app/admin` (login y órdenes, exporta CSV).
- Documentos operativos previos: `docs/` (dominio, cutover, Resend, admin, lanzamiento, migración, Mercado Pago).

## Integración con Operflow
- Solo por `docs/CONTRATO-INTEGRACION.md` (copia de solo lectura; el original vive en Operflow). Mensajes A–E, servidor a servidor, clave Bearer y avisos firmados con HMAC.

## Niveles de autonomía
| Nivel | Claude puede sin preguntar |
| --- | --- |
| 0 · Lectura | Leer, buscar, comandos de solo lectura (`git status`, `git log`, `git diff`) |
| 1 · Editar | + Crear y editar archivos en la carpeta, commits locales, instalar dependencias, pruebas y build |
| **2 · Subir (actual)** | + Push a GitHub, ramas y etiquetas de respaldo |
| 3 · Servicios de desarrollo | + Publicar en prueba, SQL en la base de desarrollo, navegador y conectores del perímetro |
| 4 · Producción | + Publicar en producción y cambios en la base real, con respaldo previo |

En cualquier nivel se pide permiso para: borrar cualquier archivo o dato, salir de la carpeta, dinero, contraseñas o inicios de sesión, aceptar términos.

## Cómo se trabaja
- `/retomar` al abrir sesión; `/cierre` al terminar. Una sesión por hito; modo plan al iniciar cada hito.
- Permisos: `.claude/settings.json` (compartido, en git) y `.claude/settings.local.json` (personal, fuera de git).
- Hook anti-secretos: `.claude/hooks/revisar-secretos.sh` (revisa líneas nuevas en commit y push).
- Respaldos: etiqueta `respaldo-AAAA-MM-DD-tema`; datos en `respaldos/` (fuera de git).

## Cómo se prueban los permisos
- Por definir en W1: usuarios ficticios (gerencia, asesor A, asesor B) que se crean y se borran solos; muestran el total y solo las fallas.

## Cómo se ejecuta SQL
- Por definir en W1: cada cambio de base en un archivo de migración versionado.

## Trucos aprendidos
- (vacío)
