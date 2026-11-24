# Hechomadera-web

Al empezar cada sesión lee **solo** `docs/ESTADO.md` (o usa `/retomar`). Lo demás se lee cuando haga falta: `PRODUCTO.md`, `PLAN.md`, `docs/DECISIONES.md`, `docs/REFERENCIA.md`, `docs/hitos/`, `docs/CONTRATO-INTEGRACION.md`.

## Comunicación
- Español simple, sin jerga. Pregunta antes de suponer. Respuestas cortas que terminan con el siguiente paso.

## Perímetro
- Carpeta `/Users/albertocotesd/Desktop/HECHOMADERA`, repositorio `infohechomadera-creator/Hechomadera-web`.
- Servicios de **esta** web: Vercel, Supabase de la web (proyecto Hechomadera, ref `seazgghpynhflxvrjpee`, plan gratis; el proyecto `operflow` de la misma organización NO se toca), Upstash Redis, Mercado Pago y Resend. Nada fuera de aquí.
- **Operflow es otro proyecto.** Solo se habla con él por el contrato (`docs/CONTRATO-INTEGRACION.md`, copia de solo lectura). No se copia código ni datos de Operflow.

## Nivel de autonomía actual: 3 (todo dentro del proyecto, sin preguntar) — desde 2026-11-18; el nivel 4 rigió solo durante W7 (2026-11-24)
- Sin preguntar: todo lo que está dentro del proyecto: archivos de la carpeta (incluido borrar), git local, push de la rama de trabajo, SQL en el Supabase de la web, Supabase y Vercel de esta web desde Chrome (sesión de Alberto).
- Qué incluye cada nivel: tabla en `docs/REFERENCIA.md`. Historial: `docs/DECISIONES.md`.
- Usar en Chrome una sesión que Alberto ya abrió (Supabase, Vercel, la web) **sí** está autorizado (2026-11-18).
- **Nunca, aunque haya autorización:** copiar o pegar llaves secretas o contraseñas, escribir su contraseña o pulsar "Entrar" por él, dinero o planes pagos, aceptar términos.
- Toda acción en un servicio externo se anota en `docs/DECISIONES.md` con qué, dónde y cómo revertirla.
- **Siempre pide permiso para:** tocar algo fuera del perímetro (otros proyectos como Operflow), borrar en GitHub (ramas o etiquetas remotas) y pasar a producción (`main`).

## Alcance
- Construye lo que está en la Versión 1 de `PRODUCTO.md`, hito por hito según `PLAN.md`. Si falta algo, propónlo con su motivo; se agrega solo si se aprueba.

## Seguridad y respaldos
- **Nunca leas `.env` ni `.env.local`.** Para saber qué variables hay, usa `.env.example`.
- Permisos en la base de datos (RLS), no solo en pantalla. Pruebas de permisos por rol en cada hito.
- Los montos de cobro se calculan en el servidor, nunca en el navegador.
- Commits pequeños con "(hito N)". Etiqueta `respaldo-AAAA-MM-DD-tema` antes de cambios grandes. Copia de datos en `respaldos/` antes de SQL que cambie o borre.

## Contexto y tokens
- Una sesión por hito. Al cerrar, `/cierre` y propón seguir en una sesión nueva.
- Lo importante va a archivos: `docs/ESTADO.md` (máx. ~50 líneas), `docs/DECISIONES.md` (con fecha y motivo, nunca se borran), `docs/hitos/hito-N.md`.
- No metas archivos grandes en la conversación; lee solo la parte necesaria; usa texto antes que capturas.
- Búsquedas amplias y revisiones independientes van a subagentes; solo vuelve la conclusión.
- Este proyecto no usa información de otros proyectos.
