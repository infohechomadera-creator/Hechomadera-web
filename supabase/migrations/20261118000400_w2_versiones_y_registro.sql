-- W2 · Precios: gerencia puede publicar varias versiones el mismo día (la más reciente manda).
-- Integración: registro de cada llamada con Operflow (sin datos sensibles), como pide el contrato.

alter table public.precios drop constraint precios_ciudad_vigente_desde_key;

create or replace view public.precios_vigentes with (security_invoker = true) as
  select distinct on (ciudad) id, ciudad, vigente_desde, datos, creado_at
  from public.precios
  where vigente_desde <= current_date
  order by ciudad, vigente_desde desc, creado_at desc;

revoke all on public.precios_vigentes from anon;

create table public.eventos_integracion (
  id           bigint generated always as identity primary key,
  direccion    text not null check (direccion in ('entrada', 'salida')),
  mensaje      text not null check (mensaje in ('A', 'B', 'C', 'D', 'E')),
  estado_http  integer,
  detalle      text check (detalle is null or length(detalle) <= 500),
  creado_at    timestamptz not null default now()
);

create index eventos_integracion_fecha_idx on public.eventos_integracion (creado_at desc);

alter table public.eventos_integracion enable row level security;
revoke all on public.eventos_integracion from anon;

-- Solo gerencia lo consulta; solo el servidor (llave secreta) escribe.
create policy eventos_ver on public.eventos_integracion for select to authenticated
  using (public.es_gerencia());
