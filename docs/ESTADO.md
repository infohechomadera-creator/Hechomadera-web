# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-18.

## Dónde vamos
- W0 cerrado (etiqueta `hito-0`). W1 y W2 hechos. **W3 hecho**: configurador `/cocinas/configurar` (9 pasos, rango en el servidor, fotos opcionales) y panel `/admin/leads` para gerencia. Todo en la rama `w1-w2-base` (no está en producción). Diarios: `docs/hitos/hito-1.md`, `hito-2.md`, `hito-3.md`.
- Probado: 149 pruebas, lint y build sin errores; validador (2 pasadas) y auditor sin desviaciones graves. Alberto envió el lead real 4DAF4A75 desde su celular y lo vio en el panel.
- Supabase (proyecto Hechomadera, ref `seazgghpynhflxvrjpee`): migraciones hasta `…0600` aplicadas; cubeta privada `fotos-espacio`; usuario `infohechomadera@gmail.com` con rol gerencia; registro libre desactivado.
- Login con Supabase en `/admin/login`. Contraseña única y token retirados del código; las APIs revisan el rol dos veces.
- Límites: 30 intentos/h y 8 envíos/h por IP; tope de 60 envíos con fotos por hora en todo el sitio (luego se guarda sin fotos).
- Vista previa de la rama: https://hechomadera-web-git-w1-dce765-infohechomadera-creators-projects.vercel.app
- Rediseño estilo awesomic.com descartado por Alberto.
- Autonomía nivel 3: todo dentro del proyecto sin preguntar; nunca llaves, contraseñas, dinero ni términos (ver `CLAUDE.md`). Chrome siempre que se pueda.

## Siguiente paso exacto
1. **Sesión nueva** con `/retomar` para **W4** (CRM mínimo: el asesor ve sus leads, cambia estados, deja notas, marca el filtro; un asesor no ve leads ajenos), en modo plan. El lead 4DAF4A75 sirve para probar.
2. Alberto: cambiar en Vercel `SUPABASE_SECRET_KEY` a tipo **Secret** (sube de prioridad: ya hay datos personales y fotos de clientes).
3. Alberto: ajustar precios reales en `/admin/precios` (D1 Barranquilla está en $2.000.000 de prueba).
4. Con visto bueno de Alberto: pasar la rama a `main` y luego quitar `ADMIN_PASSWORD` y `ADMIN_API_TOKEN` de Vercel.

## Pendientes abiertos
- Abogado: revisar texto de autorización Ley 1581 (`2026-11-18-v1`) y política de privacidad (no menciona fotos) antes de producción.
- W5: borrar fotos de la cubeta al borrar cliente o "no aprobó"; "no aprobó" del asesor pasa por el servidor.
- `OPERFLOW_API_KEY` en Vercel cuando Operflow la genere (la API de precios responde 503 hasta entonces).
- Confirmar la fórmula de precios provisional (suma de paredes, recargos, ±12%).
- Por aprobar: pasar las órdenes de Redis a Supabase en W4.
- Por definir: los 5 diseños base definitivos; costo de la visita de medición; métricas de conversión.

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
