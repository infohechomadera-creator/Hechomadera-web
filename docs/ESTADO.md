# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-18.

## Dónde vamos
- W0 cerrado (etiqueta `hito-0`). **W1 en curso** con adelanto de W2, en la rama `w1-w2-base` (no está en producción). Diario: `docs/hitos/hito-1.md`.
- Listo y probado: migraciones con RLS, pruebas por rol (`npm test`), motor de precios, página `/cocinas` provisional.
- Rediseño estilo awesomic.com probado y **descartado** por Alberto: la web sigue con su diseño original.
- Supabase: proyecto `hechomadera` creado por Alberto; **migraciones aún sin aplicar**.
- Autonomía: Claude avanza sin pedir aprobación de cada plan; sigue pidiendo permiso para borrar, dinero, salir de la carpeta, contraseñas y términos (ver `docs/DECISIONES.md`).

## Siguiente paso exacto
1. Alberto sigue `supabase/APLICAR.md` (migraciones, llaves en `.env.local` y Vercel, usuario de gerencia).
2. Claude: login de gerencia y asesor con Supabase, reemplazo del token del admin, precios leídos de la base.
3. Con la aprobación de Alberto, pasar la rama a `main` (publica en producción).

## Pendientes abiertos
- Confirmar la fórmula de precios provisional (suma de paredes, recargos, ±12%).
- Por aprobar: pasar las órdenes de Redis a Supabase en W4.
- Por definir: los 5 diseños base definitivos; costo de la visita de medición; métricas de conversión.
- Revisión de términos por un abogado antes de W7.

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
