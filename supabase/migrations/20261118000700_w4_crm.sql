-- W4 · CRM mínimo. No cambia datos; agrega reglas.
--  1. El historial de estados y asignaciones lo escribe la base sola (no depende de la pantalla).
--     Por eso el asesor ya solo puede escribir actividades de tipo 'nota'.
--  2. Un lead solo se asigna a un perfil activo del equipo.
--  3. `nombres_equipo()`: nombres del equipo para mostrar quién escribió cada nota,
--     sin abrirle al asesor la tabla de perfiles.

-- 1 ── Historial automático ─────────────────────────────────────────────────
create function public.etiqueta_estado(p public.estado_lead) returns text
language sql immutable set search_path = ''
as $$
  select case p
    when 'nuevo' then 'Nuevo'
    when 'contactado' then 'Contactado'
    when 'diseno_pagado' then 'Diseño pagado'
    when 'propuesta_enviada' then 'Propuesta enviada'
    when 'aprobado' then 'Aprobado'
    when 'no_aprobo' then 'No aprobó'
    when 'perdido' then 'Perdido'
  end
$$;

create function public.registrar_cambios_lead() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_nombre text;
begin
  if new.estado is distinct from old.estado then
    insert into public.actividades (lead_id, autor_id, tipo, detalle)
    values (new.id, auth.uid(), 'cambio_estado',
            public.etiqueta_estado(old.estado) || ' → ' || public.etiqueta_estado(new.estado));
  end if;
  if new.asesor_id is distinct from old.asesor_id then
    select p.nombre into v_nombre from public.perfiles p where p.id = new.asesor_id;
    insert into public.actividades (lead_id, autor_id, tipo, detalle)
    values (new.id, auth.uid(), 'asignacion',
            case when new.asesor_id is null then 'Quedó sin asesor' else 'Asignado a ' || coalesce(v_nombre, 'otra persona') end);
  end if;
  return null;
end;
$$;

create trigger leads_registrar_cambios
  after update on public.leads
  for each row execute function public.registrar_cambios_lead();

drop policy actividades_crear on public.actividades;
create policy actividades_crear on public.actividades for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (
      public.es_gerencia()
      or (public.es_mi_lead(lead_id) and tipo = 'nota')
    )
  );

-- 2 ── Asignar solo a perfiles activos ──────────────────────────────────────
-- Aplica a quien tiene sesión (la pantalla de gerencia). Un lead que ya estaba con alguien
-- que luego se desactivó no se toca.
create function public.validar_asesor_lead() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null
     and new.asesor_id is not null
     and (tg_op = 'INSERT' or new.asesor_id is distinct from old.asesor_id)
     and not exists (select 1 from public.perfiles p where p.id = new.asesor_id and p.activo) then
    raise exception 'Solo se asigna a una persona activa del equipo' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger leads_validar_asesor
  before insert or update on public.leads
  for each row execute function public.validar_asesor_lead();

-- 3 ── Nombres del equipo ───────────────────────────────────────────────────
create function public.nombres_equipo() returns table (id uuid, nombre text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.nombre from public.perfiles p where public.es_usuario_web()
$$;

revoke execute on function public.nombres_equipo(), public.etiqueta_estado(public.estado_lead),
  public.registrar_cambios_lead(), public.validar_asesor_lead() from public, anon;
grant execute on function public.nombres_equipo() to authenticated;
