# Hechomadera-web

Al empezar cada sesión lee **solo** `docs/ESTADO.md` (o usa `/retomar`). Lo demás se lee cuando haga falta: `PRODUCTO.md`, `PLAN.md`, `docs/DECISIONES.md`, `docs/REFERENCIA.md`, `docs/hitos/`, `docs/CONTRATO-INTEGRACION.md`.

## Comunicación
- Español simple, sin jerga. Pregunta antes de suponer. Respuestas cortas que terminan con el siguiente paso.

## Perímetro
- Carpeta `/Users/albertocotesd/Desktop/HECHOMADERA`, repositorio `infohechomadera-creator/Hechomadera-web`.
- Servicios de **esta** web: Vercel, Supabase de la web (por crear en W1, plan gratis), Upstash Redis, Mercado Pago y Resend. Nada fuera de aquí.
- **Operflow es otro proyecto.** Solo se habla con él por el contrato (`docs/CONTRATO-INTEGRACION.md`, copia de solo lectura). No se copia código ni datos de Operflow.

## Nivel de autonomía actual: 2 (subir) con borrados autorizados
- Sin preguntar: leer, crear y editar archivos dentro de la carpeta, commits, push, etiquetas, instalar dependencias, pruebas y build.
- Qué incluye cada nivel: tabla en `docs/REFERENCIA.md`. Historial: `docs/DECISIONES.md`.
- **Siempre pide permiso para:** borrar cualquier archivo o dato (incluye `rm`, `git rm`, ramas o etiquetas), tocar algo fuera de la carpeta, dinero, contraseñas o inicios de sesión, aceptar términos.
- Aún no liberado: nivel 3 (Supabase/Vercel de prueba) y nivel 4 (producción).

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
