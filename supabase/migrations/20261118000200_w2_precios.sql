-- W2 · Tabla de precios por ciudad (única fuente; Operflow la consulta en modo lectura).
-- Cada cambio de gerencia crea una versión nueva con fecha de vigencia; las anteriores
-- no se editan ni se borran, así una cotización puede citar la versión que usó.
-- La forma de `datos` la valida la app (lib/precios/validar.ts).

create table public.precios (
  id             uuid primary key default gen_random_uuid(),
  ciudad         text not null,
  vigente_desde  date not null default current_date,
  datos          jsonb not null check (jsonb_typeof(datos) = 'object'),
  creado_por     uuid references public.perfiles (id) on delete set null,
  creado_at      timestamptz not null default now(),
  unique (ciudad, vigente_desde)
);

create index precios_ciudad_idx on public.precios (ciudad, vigente_desde desc);

alter table public.precios enable row level security;
revoke all on public.precios from anon;

-- Ven precios: gerencia y asesores activos. El público ve el rango calculado por el servidor.
create policy precios_ver on public.precios for select to authenticated
  using (public.es_usuario_web());

-- Solo gerencia publica versiones nuevas, a su nombre.
create policy precios_crear on public.precios for insert to authenticated
  with check (public.es_gerencia() and creado_por = auth.uid());

-- Sin políticas de update ni delete: las versiones son inmutables.

-- Versión vigente de una ciudad en una fecha.
create view public.precios_vigentes with (security_invoker = true) as
  select distinct on (ciudad) id, ciudad, vigente_desde, datos
  from public.precios
  where vigente_desde <= current_date
  order by ciudad, vigente_desde desc;
