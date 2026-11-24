# Referencia de Hechomadera-web
> Datos técnicos estables. Sin contraseñas ni llaves.

## Cuentas y servicios (de esta web)
| Servicio | Uso | Estado |
| --- | --- | --- |
| GitHub `infohechomadera-creator/Hechomadera-web` | Código | Activo |
| Vercel | Hosting; dominio `hechomadera.com` (staging `stg.hechomadera.com`) | Activo |
| Mercado Pago | Checkout Pro; webhook `/api/payments/mercadopago/webhook` | Producción |
| Resend | Correo de contacto y avisos al cliente; dominio verificado | Activo |
| Upstash Redis | (Antes: órdenes y límites de intentos) | **Retirado el 2026-11-19**: Upstash borró la base; los límites viven en Supabase |
| Vercel Analytics | Métricas básicas | Activo |
| Supabase (de la web), proyecto Hechomadera, ref `seazgghpynhflxvrjpee` | Leads, CRM, usuarios, fotos, precios | Activo (plan gratis) |
| API de Anthropic | Agente de IA (modelo `claude-haiku-5-5`, API de Mensajes, SDK `@anthropic-ai/sdk` 1.5.0 fijo) | Código listo (W6); **cuenta, llave y tope mensual por crear por Alberto** en https://platform.claude.com. Apagar: `AGENTE_IA_ACTIVO=false` o quitar la llave |

## Variables de entorno (solo nombres; ver `.env.example`)
- Sitio: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_PHONE`, `NEXT_PUBLIC_PROMO_*`.
- Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_WEBHOOK_ENFORCE`, `ENABLE_PAYMENT_TEST_PAGE`, `DEBUG_WEBHOOK_TOKEN`.
- Resend: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `RESEND_FROM`.
- Redis y Upstash: ya no se usan (variables borradas de Vercel el 2026-11-19).
- Admin: `ADMIN_API_TOKEN` y `ADMIN_PASSWORD` **obsoletos** desde W1 (login con Supabase). Quitarlos de Vercel tras pasar a producción.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL` (`https://seazgghpynhflxvrjpee.supabase.co`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- W5: `CRON_SECRET` (tarea diaria de reintentos; por crear en Vercel), `MERCADOPAGO_WEBHOOK_ENFORCE=true` recomendado en producción. Las credenciales de Mercado Pago hoy son las mismas en todos los entornos.
- W6 (agente): `ANTHROPIC_API_KEY` (tipo Secret; también deriva la firma del historial) y `AGENTE_IA_ACTIVO` (`true` para encender). Sin los dos, el botón no aparece y `/api/configurador/agente` responde 503. Pendiente agregarlas sin valor a `.env.example`.
- Agente, topes: 40 mensajes por IP por hora, 1.500 llamadas por día en todo el sitio, 30 mensajes y 60.000 caracteres por conversación, 50 s y 5 vueltas por mensaje. Código en `lib/agente/` y `components/configurador/Agente.tsx`.
- Futuras (contrato, cuando exista O3): `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET`.

## Dónde está cada cosa en el código
- Reglas de negocio: `lib/site-config.ts` (ciudades, marketplace, "precio desde", abono 35%).
- Catálogo: `content/products.json`.
- Contacto: `POST /api/contact` (Resend).
- Admin: `app/admin` (login, órdenes, exporta CSV, `/admin/precios`).
- Precios: `lib/precios/` (cálculo, validación, fuente Supabase con respaldo en la semilla).
- Integración Operflow: `lib/integracion/operflow.ts`, `app/api/integraciones/precios` (mensaje D).
- Pagos (W5): `lib/pagos/calcular.ts` (fórmulas; iguales a `monto_esperado` en la base), `lib/pagos/ordenes.ts` (órdenes y pagos en Supabase), `avisarPagoParaRevisar` (correo a gerencia); página del cliente `/pago/lead/[token]`; webhook `/api/payments/mercadopago/webhook` (la base decide con `registrar_pago`); bandeja `mensajes_operflow`; mensaje B `/api/integraciones/operflow`; reintentos `/api/integraciones/reintentar` (tarea diaria en `vercel.json`). Migraciones `20261118000900` a `20261119000500`.
- Documentos operativos previos: `docs/` (dominio, cutover, Resend, admin, lanzamiento, migración, Mercado Pago).

## Integración con Operflow
- Solo por `docs/CONTRATO-INTEGRACION.md` (copia de solo lectura; el original vive en Operflow). Mensajes A–E, servidor a servidor, clave Bearer y avisos firmados con HMAC.

## Mapa de la web
- `docs/mapa/mapa-hechomadera.html`, publicado en https://claude.ai/artifact/Q7Q8JfLv96L1EEcjf8dHyj (privado de Alberto): pantallas, botones, recorridos, permisos por rol y hallazgos. **Se actualiza solo cuando Alberto lo pide** (2026-11-24); al hacerlo, se republica en el mismo enlace.

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
- `npm test`: base Postgres local (PGlite) que imita Supabase, con usuarios ficticios (gerencia, asesor A, asesor B, inactivo, público, sistema) que desaparecen al terminar. Reglas de acceso de páginas en `tests/acceso.test.ts`.

## Cómo se ejecuta SQL
- Cada cambio va en `supabase/migrations/AAAAMMDDHHMMSS_nombre.sql`, se prueba con `npm test` y se aplica en el SQL Editor de Supabase dentro de `begin; … commit;`, comprobando la huella SHA-1 del archivo antes de ejecutar.

## Trucos aprendidos
- (vacío)
