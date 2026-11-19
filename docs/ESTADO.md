# Estado de Hechomadera-web
> Página única para retomar. Máximo ~50 líneas. Última actualización: 2026-11-19.

## Dónde vamos
- W0 cerrado (etiqueta `hito-0`). W1 a W4 hechos. **W5 hecho (pagos por lead y Operflow)**: diseño → anticipo → saldo con Mercado Pago, montos en el servidor, abonos netos; enlace de pago `/pago/lead/[token]`; bloque "Pagos" en la ficha del lead; órdenes en Supabase; bandeja `mensajes_operflow`. Todo en la rama `w1-w2-base` (no está en producción). Diarios: `docs/hitos/hito-1.md` a `hito-5.md`.
- Probado: 293 pruebas, lint y build sin errores; validador (5 pasadas, la 5ª sin caminos de pérdida de plata) y auditor sin desviaciones graves. NO probado: un pago real de prueba en Mercado Pago.
- Supabase (ref `seazgghpynhflxvrjpee`): migraciones hasta `20261119000500` aplicadas; cubeta privada `fotos-espacio`; gerencia y un "Asesor Prueba"; registro libre desactivado. Respaldo `respaldos/2026-11-19-antes-w5-pagos.json`, etiqueta `respaldo-2026-11-19-w5-pagos`.
- La base decide si un pago cuenta (`registrar_pago`); todo pago raro avisa por correo a gerencia. Fuera de producción solo gerencia inicia cobros.
- Operflow: O3 no existe; los mensajes quedan en la bandeja y se reintentan (botón y tarea diaria). Firma del mensaje B propuesta por la web, por confirmar.
- Lead real 4DAF4A75: Contactado, nada pagado, sin cambios.
- Vista previa: https://hechomadera-web-git-w1-dce765-infohechomadera-creators-projects.vercel.app
- Autonomía nivel 3: todo dentro del proyecto sin preguntar; nunca llaves, contraseñas, dinero ni términos (ver `CLAUDE.md`).

## Riesgos abiertos
- La credencial de Mercado Pago es la real en TODOS los entornos de Vercel (también Preview). Mitigado por código; falta una de prueba solo para Preview.
- Upstash Redis no responde (fetch failed): sin límites de intentos y sin copia de órdenes viejas a Supabase.
- Sin `CRON_SECRET` la tarea diaria de reintentos a Operflow no corre.
- `MERCADOPAGO_WEBHOOK_ENFORCE` no está en `true` en producción (recomendado).
- Firma del mensaje B por confirmar con Operflow.
- Datos de clientes con `SUPABASE_SECRET_KEY` aún no tipo Secret; textos legales sin revisar por abogado.

## Siguiente paso exacto
1. Alberto: credencial de PRUEBA de Mercado Pago solo para Preview; luego pago de prueba con comprador de prueba.
2. Alberto: revisar Upstash; crear `CRON_SECRET` en Vercel; con O3: `OPERFLOW_URL`, `OPERFLOW_API_KEY`, `OPERFLOW_WEBHOOK_SECRET`.
3. **Sesión nueva** con `/retomar` para **W6** (agente de IA; requiere cuenta de Anthropic con tope de gasto aprobado por Alberto), o primero los puntos 1 y 2.
4. Alberto: cerrar la pestaña del SQL Editor de Supabase (descartar cambios).
5. Con visto bueno de Alberto: pasar a `main` y quitar `ADMIN_PASSWORD` y `ADMIN_API_TOKEN` de Vercel.

## Pendientes abiertos
- `SUPABASE_SECRET_KEY` a tipo **Secret** en Vercel; precios reales en `/admin/precios` (D1 Barranquilla en $2.000.000 de prueba).
- Abogado: Ley 1581 (`2026-11-18-v1`), privacidad (no menciona fotos) y términos con la regla de diseño no reembolsable.
- Página de invitación (propuesta, no aprobada) y asesor real.
- Confirmar la fórmula de precios provisional (suma de paredes, recargos, ±12%).
- Por definir: 5 diseños base definitivos; costo de la visita de medición; métricas de conversión; valor final por O3 (hoy lo escribe gerencia).

## Antes de empezar una sesión
- Leer solo este archivo (o `/retomar`). Trabajar en la rama `w1-w2-base`.
- Nunca leer `.env` ni `.env.local`. Operflow solo por `docs/CONTRATO-INTEGRACION.md`.
- No correr `npm run build` con el servidor de desarrollo encendido.
