-- W1 · Base de datos de la web: usuarios (perfiles), clientes, leads y actividades.
-- Permisos por fila (RLS):
--   gerencia  -> ve y edita todo.
--   asesor    -> ve y edita solo sus leads (y los clientes y actividades de esos leads).
--   público   -> no ve nada. Los leads del configurador los crea el servidor.
-- Los campos de dinero y de Operflow solo los cambia el servidor o gerencia.

-- ── Tipos ────────────────────────────────────────────────────────────────
create type public.rol_web as enum ('gerencia', 'asesor');

create type public.estado_lead as enum (
  'nuevo',              -- llegó del configurador
  'contactado',         -- el asesor ya habló con el cliente
  'diseno_pagado',      -- pagó el diseño (pasa a Operflow)
  'propuesta_enviada',  -- Operflow entregó la propuesta
  'aprobado',           -- pagó el anticipo
  'no_aprobo',          -- no aprobó: se entrega el render y se borran datos
  'perdido'             -- no siguió
);

create type public.pago_estado as enum ('nada', 'diseno', 'anticipo', 'saldo');

-- ── Tablas ───────────────────────────────────────────────────────────────
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  rol        public.rol_web not null default 'asesor',
  nombre     text not null check (length(trim(nombre)) between 1 and 120),
  email      text not null unique,
  activo     boolean not null default true,
  creado_at  timestamptz not null default now()
);

create table public.clientes (
  id                     uuid primary key default gen_random_uuid(),
  nombre                 text not null check (length(trim(nombre)) between 1 and 200),
  telefono               text not null check (telefono ~ '^\+?[0-9 ]{7,20}$'),
  email                  text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  direccion              text check (direccion is null or length(direccion) <= 300),
  ciudad                 text not null,
  -- Ley 1581: fecha y versión del texto de autorización que aceptó.
  autorizacion_datos_at  timestamptz not null,
  autorizacion_version   text not null,
  creado_at              timestamptz not null default now()
);

create table public.leads (
  id                    uuid primary key default gen_random_uuid(),
  cliente_id            uuid not null references public.clientes (id) on delete cascade,
  producto              text not null default 'cocina' check (producto in (
                          'cocina', 'closet', 'mueble_bano', 'centro_entretenimiento', 'puerta', 'escritorio')),
  ciudad                text not null,
  configuracion         jsonb not null default '{}'::jsonb,
  rango_min             bigint check (rango_min >= 0),
  rango_max             bigint check (rango_max >= rango_min),
  estado                public.estado_lead not null default 'nuevo',
  asesor_id             uuid references public.perfiles (id) on delete set null,
  pago_estado           public.pago_estado not null default 'nada',
  operflow_proyecto_id  text,
  operflow_etapa        text,
  operflow_estado       text,
  proximo_contacto      date,
  creado_at             timestamptz not null default now(),
  actualizado_at        timestamptz not null default now()
);

create index leads_asesor_idx on public.leads (asesor_id);
create index leads_estado_idx on public.leads (estado);
create index leads_cliente_idx on public.leads (cliente_id);

create table public.actividades (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  autor_id   uuid references public.perfiles (id) on delete set null,
  tipo       text not null check (tipo in ('nota', 'cambio_estado', 'asignacion', 'pago', 'operflow')),
  detalle    text not null check (length(detalle) between 1 and 5000),
  creado_at  timestamptz not null default now()
);

create index actividades_lead_idx on public.actividades (lead_id);

-- ── Funciones de apoyo (leen el perfil sin pasar por RLS) ───────────────
create function public.rol_actual() returns public.rol_web
language sql stable security definer set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create function public.es_gerencia() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'gerencia', false)
$$;

create function public.es_usuario_web() returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.rol_actual() is not null
$$;

-- ¿El usuario actual es el asesor activo de este lead?
create function public.es_mi_lead(p_lead_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_usuario_web() and exists (
    select 1 from public.leads l where l.id = p_lead_id and l.asesor_id = auth.uid()
  )
$$;

create function public.es_mi_cliente(p_cliente_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_usuario_web() and exists (
    select 1 from public.leads l where l.cliente_id = p_cliente_id and l.asesor_id = auth.uid()
  )
$$;

revoke execute on function public.rol_actual(), public.es_gerencia(), public.es_usuario_web(),
  public.es_mi_lead(uuid), public.es_mi_cliente(uuid) from public, anon;
grant execute on function public.rol_actual(), public.es_gerencia(), public.es_usuario_web(),
  public.es_mi_lead(uuid), public.es_mi_cliente(uuid) to authenticated;

-- ── Reglas de integridad ─────────────────────────────────────────────────
-- Un asesor no puede cambiar dinero, Operflow, configuración ni datos de origen del lead.
-- El servidor (sin usuario) y gerencia sí pueden.
create function public.proteger_campos_lead() returns trigger
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
       or new.creado_at is distinct from old.creado_at then
      raise exception 'Solo gerencia o el sistema pueden cambiar ese dato del lead'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_proteger_campos
  before update on public.leads
  for each row execute function public.proteger_campos_lead();

-- ── Permisos por fila ────────────────────────────────────────────────────
alter table public.perfiles    enable row level security;
alter table public.clientes    enable row level security;
alter table public.leads       enable row level security;
alter table public.actividades enable row level security;

-- El público (anon) no toca estas tablas en absoluto.
revoke all on public.perfiles, public.clientes, public.leads, public.actividades from anon;

-- perfiles: cada quien ve el suyo; gerencia ve y administra todos.
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_gerencia());
create policy perfiles_crear on public.perfiles for insert to authenticated
  with check (public.es_gerencia());
create policy perfiles_editar on public.perfiles for update to authenticated
  using (public.es_gerencia()) with check (public.es_gerencia());
create policy perfiles_borrar on public.perfiles for delete to authenticated
  using (public.es_gerencia());

-- clientes: gerencia todo; asesor ve y corrige los clientes de sus leads.
create policy clientes_ver on public.clientes for select to authenticated
  using (public.es_gerencia() or public.es_mi_cliente(id));
create policy clientes_editar on public.clientes for update to authenticated
  using (public.es_gerencia() or public.es_mi_cliente(id))
  with check (public.es_gerencia() or public.es_mi_cliente(id));
create policy clientes_crear on public.clientes for insert to authenticated
  with check (public.es_gerencia());
create policy clientes_borrar on public.clientes for delete to authenticated
  using (public.es_gerencia());

-- leads: gerencia todo; asesor ve y edita los suyos y no puede reasignarlos.
create policy leads_ver on public.leads for select to authenticated
  using (public.es_gerencia() or (public.es_usuario_web() and asesor_id = auth.uid()));
create policy leads_editar on public.leads for update to authenticated
  using (public.es_gerencia() or (public.es_usuario_web() and asesor_id = auth.uid()))
  with check (public.es_gerencia() or (public.es_usuario_web() and asesor_id = auth.uid()));
create policy leads_crear on public.leads for insert to authenticated
  with check (public.es_gerencia());
create policy leads_borrar on public.leads for delete to authenticated
  using (public.es_gerencia());

-- actividades: historial que no se edita. Se ven y se agregan sobre leads propios.
create policy actividades_ver on public.actividades for select to authenticated
  using (public.es_gerencia() or public.es_mi_lead(lead_id));
create policy actividades_crear on public.actividades for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (public.es_gerencia() or public.es_mi_lead(lead_id))
  );
