# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-18.

## Dónde vamos
- W0 cerrado (etiqueta `hito-0`). W1, W2 y W3 hechos. **W4 hecho (CRM mínimo)**: el asesor entra solo a sus leads (`/admin/leads`), cambia estado, pone próximo contacto y deja notas; gerencia asigna asesores y ve todo. Todo en la rama `w1-w2-base` (no está en producción). Diarios: `docs/hitos/hito-1.md` a `hito-4.md`.
- Probado: 180 pruebas, lint y build sin errores; validador (2 pasadas) y auditor sin desviaciones graves. Prueba real con el asesor de prueba en la vista previa y con RLS directo contra Supabase.
- Supabase (proyecto Hechomadera, ref `seazgghpynhflxvrjpee`): migraciones hasta `…0800` aplicadas; cubeta privada `fotos-espacio`; usuario de gerencia (correo en Supabase) y un "Asesor Prueba" (rol asesor); registro libre desactivado.
- Historial de estados y asignaciones lo escribe la base (disparador); con sesión solo se escriben notas.
- Login con Supabase en `/admin/login`. Las APIs revisan el rol dos veces.
- Límites: 30 intentos/h y 8 envíos/h por IP; tope de 60 envíos con fotos por hora en todo el sitio.
- Lead real 4DAF4A75 queda en Contactado, sin asesor, próximo contacto 20/11, con notas de prueba (a pedido de Alberto).
- Vista previa de la rama: https://hechomadera-web-git-w1-dce765-infohechomadera-creators-projects.vercel.app
- Autonomía nivel 3: todo dentro del proyecto sin preguntar; nunca llaves, contraseñas, dinero ni términos (ver `CLAUDE.md`). Chrome siempre que se pueda.

## Siguiente paso exacto
1. **Sesión nueva** con `/retomar` para **W5** (pagos por lead: diseño → anticipo → saldo; órdenes de Redis a Supabase; envío a Operflow por el contrato), en modo plan.
2. Alberto: cerrar la pestaña del SQL Editor de Supabase (descartar cambios).
3. Alberto: `SUPABASE_SECRET_KEY` a tipo **Secret** en Vercel (urgente: hay datos y fotos de clientes).
4. Alberto: precios reales en `/admin/precios` (D1 Barranquilla está en $2.000.000 de prueba).
5. Con visto bueno de Alberto: pasar la rama a `main` y luego quitar `ADMIN_PASSWORD` y `ADMIN_API_TOKEN` de Vercel.

## Pendientes abiertos
- W5: órdenes Redis a Supabase; marcado del pago (Mercado Pago y manual de gerencia) que envía a Operflow; "no aprobó" por el servidor y borrar fotos de la cubeta; regla en la base de que un lead pagado no vuelva a estado a mano.
- Página para que un usuario nuevo cree su propia clave (invitación): propuesta, no aprobada. Luego crear el asesor real.
- Abogado: revisar texto de autorización Ley 1581 (`2026-11-18-v1`) y política de privacidad (no menciona fotos) antes de producción.
- `OPERFLOW_API_KEY` en Vercel cuando Operflow la genere (la API de precios responde 503 hasta entonces).
- Confirmar la fórmula de precios provisional (suma de paredes, recargos, ±12%).
- Por definir: los 5 diseños base definitivos; costo de la visita de medición; métricas de conversión.

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
