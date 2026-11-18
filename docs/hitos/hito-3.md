# Hito W3 · Configurador guiado y leads
> Diario del hito. Se agrega información; no se borra.

## 2026-11-18
**Hecho**
- Validador sobre `hito-0..HEAD`. Correcciones en la migración `…0500`: el asesor solo mueve su lead entre nuevo/contactado/perdido (ni hacia ni desde otros estados); no cambia la autorización de datos; solo crea actividades nota/cambio_estado; vigencia de precios con fecha de Colombia. La API de Operflow frena por IP antes de revisar la clave (`lib/limite.ts`).
- Configurador `/cocinas/configurar` en 9 pasos: forma, diseño, acabado, herrajes, electrodomésticos, medidas, rango, fotos, datos. Rango calculado en el servidor (`/api/configurador/rango`) y recalculado al guardar (`/api/configurador/lead`).
- Fotos opcionales (hasta 5): reducidas en el navegador a ≤750 KB, revisadas por sus bytes reales, guardadas en la cubeta privada `fotos-espacio`.
- Autorización Ley 1581 versionada `2026-11-18-v1` (borrador para el abogado). `envio_id` evita leads repetidos.
- Guardado en orden seguro (fotos, cliente, lead, archivos) con deshacer si algo falla.
- Límites: 30 intentos/h por IP y 8 envíos válidos/h por IP; si se pasan 60 envíos con fotos por hora en todo el sitio, el lead se guarda sin fotos.
- Aviso por correo a gerencia por cada lead (sin teléfono ni fotos).
- Panel `/admin/leads` y detalle con fotos por enlaces firmados de 10 min (solo gerencia). El botón "Quiero mi cocina" de `/cocinas` lleva al configurador.
- Migración `…0600`: tabla `archivos` con RLS (gerencia todo, asesor solo sus leads, nadie con sesión escribe), `leads.envio_id` protegido, ruta de foto atada a su lead, cubeta privada sin políticas en `storage.objects`.
- Dos pasadas del validador, todo corregido. 149 pruebas, lint y build sin errores. Auditor sin desviaciones graves.
- Supabase (desde Chrome): `…0500` y `…0600` aplicadas y verificadas. Prueba real: Alberto envió desde su celular el lead 4DAF4A75 (cocina en L, Barranquilla, 1 foto) y lo vio en el panel. Leads de prueba de Claude borrados con respaldo (`respaldos/2026-11-18-leads-de-prueba-claude.json`).
- Vista previa de la rama: https://hechomadera-web-git-w1-dce765-infohechomadera-creators-projects.vercel.app

**Aprendido**
- El validador encontró huecos reales de permisos (asesor cambiando estados o autorización); conviene correrlo antes de cada cierre.
- Las fotos solo pasan por el servidor; la cubeta no tiene políticas, así que ningún navegador accede directo.

**Pendientes**
1. Alberto: `SUPABASE_SECRET_KEY` a tipo Secret en Vercel (más urgente: ya hay datos personales y fotos).
2. Alberto: precios reales en `/admin/precios` (D1 Barranquilla en $2.000.000 de prueba).
3. Con visto bueno de Alberto: rama a `main` y luego quitar `ADMIN_PASSWORD` y `ADMIN_API_TOKEN` de Vercel.
4. W5: al borrar un cliente o "no aprobó", borrar también sus fotos de la cubeta; "no aprobó" del asesor pasa por el servidor.
5. Abogado: revisar texto de autorización y política de privacidad (no menciona fotos).
6. Abiertos de antes: `OPERFLOW_API_KEY`, fórmula de precios provisional, órdenes de Redis a Supabase en W4, 5 diseños definitivos, costo de la visita.

**Commits del hito (rango hito-2..HEAD, últimos):** 6d4450c, 3a16dc0, 031684d, b50543c, d36ee6f. Lista completa por confirmar con `git log`.
