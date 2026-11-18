# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-18.

## Dónde vamos
- W0 cerrado (etiqueta `hito-0`). **W1 en curso** con adelanto de W2, en la rama `w1-w2-base` (no está en producción). Diario: `docs/hitos/hito-1.md`.
- Listo y probado: migraciones con RLS, pruebas por rol (`npm test`), motor de precios, página `/cocinas` provisional.
- Rediseño estilo awesomic.com probado y **descartado** por Alberto: la web sigue con su diseño original.
- Supabase (proyecto Hechomadera, ref `seazgghpynhflxvrjpee`): migraciones y precios aplicados; llaves en `.env.local` y Vercel (conexión verificada con `/api/salud`); usuario `infohechomadera@gmail.com` con rol gerencia; registro libre desactivado; URLs de redirección configuradas.
- **Login con Supabase** en `/admin/login`, probado por Alberto. Se retiró la contraseña única (`ADMIN_PASSWORD`) y el token (`ADMIN_API_TOKEN`) del código; las APIs revisan el rol dos veces.
- `/cocinas` lee los precios de Supabase (con la semilla como respaldo si falla).
- Autonomía nivel 3: todo dentro del proyecto sin preguntar; nunca llaves, contraseñas, dinero ni términos (ver `CLAUDE.md`).

## Siguiente paso exacto
1. Cerrar W1 con `/cierre` (validador + auditor) y empezar W2: editor de precios para gerencia y consulta de precios para Operflow (mensaje D).
2. Alberto: cambiar en Vercel `SUPABASE_SECRET_KEY` a tipo **Secret** (hoy está como Config, legible).
3. Con la aprobación de Alberto, pasar la rama a `main` (publica en producción) y luego quitar `ADMIN_PASSWORD` y `ADMIN_API_TOKEN` de Vercel.

## Pendientes abiertos
- Confirmar la fórmula de precios provisional (suma de paredes, recargos, ±12%).
- Por aprobar: pasar las órdenes de Redis a Supabase en W4.
- Por definir: los 5 diseños base definitivos; costo de la visita de medición; métricas de conversión.
- Revisión de términos por un abogado antes de W7.

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
