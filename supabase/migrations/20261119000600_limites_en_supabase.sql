-- Límites de intentos en Supabase (2026-11-19). Reemplaza Upstash Redis, que Upstash borró por falta de uso.
-- Decidió Alberto: no usar Redis ni Upstash si ya está Supabase. No cambia datos.
--  - `limites`: un contador por clave y ventana de tiempo. La clave es una huella (SHA-256) que arma el
--    servidor, así que en la tabla no queda ninguna IP ni dato personal.
--  - `contar_intento()`: suma uno y dice si todavía hay cupo. Solo el servidor la ejecuta.
--  - Los contadores vencidos se borran solos de vez en cuando (no crecen sin fin en el plan gratis).

create table public.limites (
  clave     text not null check (clave ~ '^[0-9a-f]{64}$'),
  ventana   bigint not null,
  n         integer not null default 1,
  vence_at  timestamptz not null,
  primary key (clave, ventana)
);

create index limites_vence_idx on public.limites (vence_at);

alter table public.limites enable row level security;
revoke all on public.limites from anon, authenticated;
-- Sin políticas: nadie con sesión la ve ni la toca; solo el servidor por la función de abajo.

create function public.contar_intento(p_clave text, p_ventana_seg integer, p_limite integer) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_ventana bigint;
  v_n       integer;
begin
  if p_clave !~ '^[0-9a-f]{64}$' or p_ventana_seg not between 1 and 86400 or p_limite < 1 then
    return true;
  end if;
  v_ventana := floor(extract(epoch from now()) / p_ventana_seg)::bigint;
  insert into public.limites (clave, ventana, n, vence_at)
  values (p_clave, v_ventana, 1, now() + make_interval(secs => p_ventana_seg * 2))
  on conflict (clave, ventana) do update set n = public.limites.n + 1
  returning n into v_n;
  -- Limpieza ocasional de contadores vencidos (más o menos 1 de cada 50 llamadas).
  if random() < 0.02 then
    delete from public.limites where vence_at < now();
  end if;
  return v_n <= p_limite;
end;
$$;

revoke execute on function public.contar_intento(text, integer, integer) from public, anon, authenticated;
grant execute on function public.contar_intento(text, integer, integer) to service_role;
