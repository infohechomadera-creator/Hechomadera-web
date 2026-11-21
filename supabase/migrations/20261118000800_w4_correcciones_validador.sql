-- W4 · Correcciones del validador (2026-11-18). No cambia datos.
--  1. La fecha de una actividad la pone la base: quien tiene sesión no puede escribir una nota
--     "con fecha de la semana pasada" ni del futuro para que quede arriba.
--  2. Con sesión (gerencia o asesor) solo se escriben notas. Los cambios de estado y asignaciones
--     los registra el disparador; los pagos y Operflow, el servidor (W5).

-- 1 ── Fecha de la actividad ────────────────────────────────────────────────
create function public.fijar_fecha_actividad() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.creado_at := now();
  end if;
  return new;
end;
$$;

create trigger actividades_fijar_fecha
  before insert on public.actividades
  for each row execute function public.fijar_fecha_actividad();

revoke execute on function public.fijar_fecha_actividad() from public, anon;

-- 2 ── Solo notas con sesión ────────────────────────────────────────────────
drop policy actividades_crear on public.actividades;
create policy actividades_crear on public.actividades for insert to authenticated
  with check (
    autor_id = auth.uid()
    and tipo = 'nota'
    and (public.es_gerencia() or public.es_mi_lead(lead_id))
  );
