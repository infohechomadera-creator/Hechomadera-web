# Hito W4 · CRM mínimo
> Diario del hito. Se agrega información; no se borra.

## 2026-11-18
**Hecho**
- Ficha del lead `/admin/leads/[id]` con panel "Seguimiento" (`components/admin/PanelCrm.tsx`): filtro de pago (solo se ve), estado nuevo/contactado/perdido, próximo contacto (de hoy a 1 año), notas e historial con autor. Gerencia además ve "Asignado a". Abierta al asesor; las fotos se firman solo para las filas que la RLS le devuelve.
- Lista `/admin/leads` con filtros (estado, "Pasó el filtro" / "Sin pagar el diseño", y para gerencia: sin asignar / por asesor). El asesor ve "Mis leads" ordenado por próximo contacto, con los vencidos en rojo.
- Acceso (`lib/acceso.ts`, `middleware.ts`): el asesor entra solo a `/admin/leads` y `/admin/leads/<id>`; `/admin` lo lleva a sus leads; precios, órdenes y `/pago/prueba` sin permiso; `/api/admin` responde 401.
- Acciones del servidor `app/admin/leads/acciones.ts`: `cambiarEstado` (solo si el lead sigue en un estado a mano, también para gerencia), `ponerProximoContacto`, `asignarAsesor` (solo gerencia), `agregarNota`. Reglas puras en `lib/leads.ts`.
- Base: migración `20261118000700_w4_crm` (historial automático de estado y asignación por disparador, asignar solo a perfiles activos, `nombres_equipo()` que devuelve solo id y nombre) y `20261118000800_w4_correcciones_validador` (la fecha de las actividades la pone la base si hay sesión; con sesión solo se escriben notas, también gerencia). Ambas aplicadas en Supabase desde Chrome, en transacción, y verificadas (disparadores, política, RLS activo, anon sin permiso a `nombres_equipo`).
- Pruebas: 180 (18 archivos), lint y build sin errores. Nuevas: `tests/db/crm.test.ts`, `tests/crm.test.ts`, `tests/acciones-crm.test.ts`; actualizadas `tests/acceso.test.ts` y `tests/admin-lead.test.tsx`.
- Prueba real en la vista previa de Vercel con el asesor de prueba (correo en Supabase): vio solo el lead 4DAF4A75 y su foto, lo pasó a Contactado, puso próximo contacto 20/11 y dejó una nota (todo en el historial a su nombre); no entra a `/admin/precios` ni a `/api/admin` (401). Gerencia le quitó el lead: ficha 404 y lista vacía; con su sesión, directo contra REST y Storage de Supabase: vacío en leads, clientes, actividades, archivos y fotos; nota en ese lead rechazada (403). Gerencia dejó una nota después de la 0800 y funcionó.
- Validador: 1ª pasada con 1 hallazgo real (la fecha de las notas se podía falsificar escribiendo directo en la base) y mejoras (gerencia podía devolver a "nuevo" un lead pagado, gerencia podía escribir historial a mano, el selector saltaba); todo corregido (migración 0800, commits 358db53 y a4ff4ed). 2ª pasada sin problemas reales. Auditor sin desviaciones graves.

**Aprendido**
- El validador volvió a encontrar un hueco real escribiendo directo contra la base: lo que importa (fechas, historial) lo debe fijar la base, no la pantalla.
- Probar con sesión real del asesor contra REST y Storage es lo que confirma que la RLS funciona, más allá de las pruebas automáticas.

**Pendientes**
1. W5: órdenes de Redis a Supabase; marcado del pago (Mercado Pago y manual de gerencia) que envía el proyecto a Operflow; "no aprobó" por el servidor y borrar fotos de la cubeta; regla en la base para que un lead pagado no vuelva a estado a mano.
2. Página para que un usuario nuevo cree su propia clave (invitación), necesaria para el asesor real. Propuesta, aún no aprobada.
3. Crear el asesor real.
4. Alberto: cerrar la pestaña del SQL Editor de Supabase (quedó vacía; pide confirmar al salir): descartar cambios.
5. Siguen los anteriores: `SUPABASE_SECRET_KEY` tipo Secret en Vercel, precios reales, abogado (Ley 1581 y privacidad), `OPERFLOW_API_KEY`, pasar a `main` con visto bueno de Alberto.

**Commits del hito (hito-3..HEAD):**
- ffc4f48 feat: historial automático, asignación a perfiles activos y nombres del equipo en la base
- ce500dd feat: el asesor entra a su panel de leads y nada más
- bcca0c9 feat: ficha del lead con seguimiento (estado, próximo contacto, notas, filtro y asignación)
- ebfbc70 feat: lista de leads con filtros (estado, filtro de pago, asesor) y vista 'Mis leads' del asesor
- 358db53 fix: correcciones del validador (fecha de notas la pone la base, solo notas con sesión, estado del sistema no vuelve a mano, selector sin saltos)
- a4ff4ed fix: el selector del panel vuelve a mostrar lo que dice la base después de guardar
