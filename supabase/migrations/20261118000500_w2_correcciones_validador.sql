-- W2 · Correcciones del validador (2026-11-18). Se aplica sobre lo ya publicado; no cambia datos.
--  1. Un asesor solo puede poner su lead en 'nuevo', 'contactado' o 'perdido'.
--     Los estados que dependen de un pago o de Operflow los pone el sistema o gerencia.
--  2. La prueba de la autorización de datos (Ley 1581) no la cambia un asesor.
--  3. Un asesor solo deja actividades de tipo 'nota' o 'cambio_estado'.
--  4. La vigencia de precios se cuenta con la fecha de Colombia, no la de hora universal.
--  5. Higiene: sin truncate, references ni trigger para los usuarios con sesión.

-- 1 ── Estados del lead ─────────────────────────────────────────────────────
create or replace function public.proteger_campos_lead() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.actualizado_at := now();
  if auth.uid() is not null and not public.es_gerencia() then
    if new.pago_estado is distinct from old.pago_estado
       or new.operflow_proyecto_id is distinct from old.operflow_proyecto_id
       or new.operflow_etapa is distinct from old.operflow_etapa
       or new.operflow_estado is distinct from old.operflow_estado
       or new.rango_min is distinct from old.rango_min
       or new.rango_max is distinct from old.rango_max
       or new.configuracion is distinct from old.configuracion
       or new.cliente_id is distinct from old.cliente_id
       or new.producto is distinct from old.producto
       or new.ciudad is distinct from old.ciudad
       or new.creado_at is distinct from old.creado_at
       or (new.estado is distinct from old.estado
           and new.estado not in ('nuevo', 'contactado', 'perdido')) then
      raise exception 'Solo gerencia o el sistema pueden cambiar ese dato del lead'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- 2 ── Autorización de datos del cliente ────────────────────────────────────
create function public.proteger_campos_cliente() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.es_gerencia() then
    if new.autorizacion_datos_at is distinct from old.autorizacion_datos_at
       or new.autorizacion_version is distinct from old.autorizacion_version
       or new.creado_at is distinct from old.creado_at then
      raise exception 'Solo gerencia o el sistema pueden cambiar la autorización de datos'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger clientes_proteger_campos
  before update on public.clientes
  for each row execute function public.proteger_campos_cliente();

-- 3 ── Tipos de actividad ───────────────────────────────────────────────────
drop policy actividades_crear on public.actividades;
create policy actividades_crear on public.actividades for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (
      public.es_gerencia()
      or (public.es_mi_lead(lead_id) and tipo in ('nota', 'cambio_estado'))
    )
  );

-- 4 ── Vigencia con la fecha de Colombia ────────────────────────────────────
create or replace view public.precios_vigentes with (security_invoker = true) as
  select distinct on (ciudad) id, ciudad, vigente_desde, datos, creado_at
  from public.precios
  where vigente_desde <= (now() at time zone 'America/Bogota')::date
  order by ciudad, vigente_desde desc, creado_at desc;

revoke all on public.precios_vigentes from anon;

-- 5 ── Higiene de permisos ──────────────────────────────────────────────────
revoke truncate, references, trigger on all tables in schema public from authenticated;
