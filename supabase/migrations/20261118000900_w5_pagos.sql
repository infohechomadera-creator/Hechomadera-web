-- W5 · Pagos por lead y conexión con Operflow.
--  1. Leads: enlace de pago secreto, valor final (propuesta) y valor medido.
--     Clientes: se pueden "borrar" (datos personales fuera) sin perder los pagos.
--  2. Reglas: con sesión nadie (ni gerencia) cambia lo que pagó el lead ni lo de Operflow;
--     un lead que salió de los estados a mano no vuelve a ellos; un lead pagado nunca queda
--     en un estado a mano (regla de la tabla, vale también para el sistema).
--  3. Órdenes (una por cobro de Mercado Pago o pago a mano) y pagos. Reemplazan Redis.
--  4. Registro corto del webhook de pagos (sin datos del comprador).
--  5. Bandeja de salida a Operflow (mensajes A, C y E) y avisos recibidos (mensaje B) sin repetir.
--  6. Funciones que solo usa el servidor: registrar pagos, pago a mano, valor final, avisos de
--     Operflow y borrado de datos del cliente. Cada una es una sola transacción.

-- 1 ── Columnas nuevas ──────────────────────────────────────────────────────
alter table public.leads
  add column pago_token text not null unique
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  add column valor_final bigint check (valor_final > 0),
  add column valor_final_medido bigint check (valor_final_medido > 0),
  add column operflow_url_propuesta text check (operflow_url_propuesta is null or operflow_url_propuesta ~ '^https://'),
  add constraint leads_pagado_no_vuelve_a_mano
    check (pago_estado = 'nada' or estado not in ('nuevo', 'contactado', 'perdido'));

alter table public.clientes
  add column datos_borrados_at timestamptz,
  alter column telefono drop not null,
  add constraint clientes_telefono_o_borrado check (telefono is not null or datos_borrados_at is not null);

-- 2 ── Reglas del lead y del cliente ───────────────────────────────────────
create or replace function public.proteger_campos_lead() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.actualizado_at := now();
  if auth.uid() is null then
    return new; -- el servidor (llave secreta) y las funciones de abajo
  end if;
  -- Para todos con sesión, también gerencia: dinero, Operflow y enlace de pago solo los cambia el sistema.
  if new.pago_estado is distinct from old.pago_estado
     or new.pago_token is distinct from old.pago_token
     or new.valor_final is distinct from old.valor_final
     or new.valor_final_medido is distinct from old.valor_final_medido
     or new.operflow_proyecto_id is distinct from old.operflow_proyecto_id
     or new.operflow_etapa is distinct from old.operflow_etapa
     or new.operflow_estado is distinct from old.operflow_estado
     or new.operflow_url_propuesta is distinct from old.operflow_url_propuesta
     or (new.estado is distinct from old.estado
         and (new.estado not in ('nuevo', 'contactado', 'perdido')
              or old.estado not in ('nuevo', 'contactado', 'perdido'))) then
    raise exception 'Ese dato del lead lo cambia solo el sistema' using errcode = '42501';
  end if;
  if not public.es_gerencia() then
    if new.rango_min is distinct from old.rango_min
       or new.rango_max is distinct from old.rango_max
       or new.configuracion is distinct from old.configuracion
       or new.cliente_id is distinct from old.cliente_id
       or new.producto is distinct from old.producto
       or new.ciudad is distinct from old.ciudad
       or new.creado_at is distinct from old.creado_at then
      raise exception 'Solo gerencia o el sistema pueden cambiar ese dato del lead' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.proteger_campos_cliente() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then
    -- Un cliente borrado no se vuelve a llenar a mano.
    if old.datos_borrados_at is not null or new.datos_borrados_at is distinct from old.datos_borrados_at then
      raise exception 'Los datos de este cliente ya se borraron' using errcode = '42501';
    end if;
    if not public.es_gerencia()
       and (new.autorizacion_datos_at is distinct from old.autorizacion_datos_at
            or new.autorizacion_version is distinct from old.autorizacion_version
            or new.creado_at is distinct from old.creado_at) then
      raise exception 'Solo gerencia o el sistema pueden cambiar la autorización de datos' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- 3 ── Órdenes y pagos ──────────────────────────────────────────────────────
create type public.tipo_orden as enum ('tienda', 'diseno', 'anticipo', 'saldo');
create type public.estado_orden as enum ('creada', 'pendiente', 'aprobada', 'rechazada', 'devuelta', 'repetida', 'revisar');
create type public.estado_pago as enum ('pendiente', 'aprobado', 'rechazado', 'devuelto', 'revisar');

create table public.ordenes (
  id               text primary key check (id ~ '^ord_[a-z0-9_]{4,80}$'),
  tipo             public.tipo_orden not null,
  -- Un lead con cobros no se puede borrar: la ley obliga a guardar el registro del pago.
  lead_id          uuid references public.leads (id) on delete restrict,
  constraint ordenes_lead_segun_tipo check ((tipo = 'tienda') = (lead_id is null)),
  origen           text not null default 'mercadopago' check (origen in ('mercadopago', 'manual', 'redis')),
  referencia       text check (referencia is null or length(referencia) <= 120),
  items            jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  total_cop        bigint not null check (total_cop > 0),
  estado           public.estado_orden not null default 'creada',
  preferencia_id   text check (preferencia_id is null or length(preferencia_id) <= 120),
  url_pago         text check (url_pago is null or url_pago ~ '^https://'),
  autor_id         uuid references public.perfiles (id) on delete set null,
  nota             text check (nota is null or length(nota) <= 500),
  creado_at        timestamptz not null default now(),
  actualizado_at   timestamptz not null default now()
);

create index ordenes_lead_idx on public.ordenes (lead_id);
create index ordenes_fecha_idx on public.ordenes (creado_at desc);

create table public.pagos (
  id               bigint generated always as identity primary key,
  orden_id         text not null references public.ordenes (id) on delete restrict,
  lead_id          uuid references public.leads (id) on delete restrict,
  tipo             public.tipo_orden not null,
  mp_pago_id       bigint unique, -- null en pagos a mano
  estado           public.estado_pago not null,
  estado_mp        text check (estado_mp is null or length(estado_mp) <= 40),
  detalle          text check (detalle is null or length(detalle) <= 200),
  metodo           text check (metodo is null or length(metodo) <= 60),
  monto            bigint not null check (monto >= 0),
  -- ¿Cuenta para lo pagado por el lead? No cuenta si es repetido o si el monto no cuadra.
  cuenta           boolean not null default false,
  pagado_at        timestamptz,
  creado_at        timestamptz not null default now(),
  actualizado_at   timestamptz not null default now()
);

create index pagos_orden_idx on public.pagos (orden_id);
create index pagos_lead_idx on public.pagos (lead_id);

-- 4 ── Registro del webhook de pagos ───────────────────────────────────────
create table public.eventos_pago (
  id           bigint generated always as identity primary key,
  tipo_evento  text not null check (length(tipo_evento) <= 60),
  accion       text check (accion is null or length(accion) <= 60),
  recurso_id   text check (recurso_id is null or length(recurso_id) <= 60),
  mp_pago_id   bigint,
  orden_id     text check (orden_id is null or length(orden_id) <= 90),
  estado_mp    text check (estado_mp is null or length(estado_mp) <= 40),
  procesado    boolean not null default false,
  error        text check (error is null or length(error) <= 300),
  recibido_at  timestamptz not null default now()
);

create index eventos_pago_fecha_idx on public.eventos_pago (recibido_at desc);

-- 5 ── Operflow: bandeja de salida y avisos recibidos ──────────────────────
-- Solo guarda qué hay que enviar; el cuerpo (con datos del cliente) se arma al enviar.
create table public.mensajes_operflow (
  id                 bigint generated always as identity primary key,
  lead_id            uuid not null references public.leads (id) on delete cascade,
  mensaje            text not null check (mensaje in ('A', 'C', 'E')),
  pago_id            bigint references public.pagos (id) on delete restrict,
  constraint mensajes_pago_solo_c check ((mensaje = 'C') = (pago_id is not null)),
  estado             text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'fallido', 'cancelado')),
  intentos           integer not null default 0 check (intentos >= 0),
  ultimo_error       text check (ultimo_error is null or length(ultimo_error) <= 300),
  respuesta_http     integer,
  proximo_intento_at timestamptz not null default now(),
  creado_at          timestamptz not null default now(),
  enviado_at         timestamptz
);

-- Un solo "crear proyecto" y un solo "borrar" por lead; un solo "pago registrado" por pago.
create unique index mensajes_operflow_a_e_unicos on public.mensajes_operflow (lead_id, mensaje) where mensaje in ('A', 'E');
create unique index mensajes_operflow_c_unico on public.mensajes_operflow (pago_id) where mensaje = 'C';
create index mensajes_operflow_pendientes_idx on public.mensajes_operflow (proximo_intento_at) where estado = 'pendiente';

create table public.avisos_operflow (
  huella       text primary key check (huella ~ '^[0-9a-f]{64}$'),
  lead_id      uuid references public.leads (id) on delete set null,
  evento       text not null check (length(evento) <= 40),
  recibido_at  timestamptz not null default now()
);

-- Permisos de las tablas nuevas: gerencia ve todo; el asesor, solo lo de sus leads; nadie con
-- sesión escribe (solo el servidor).
alter table public.ordenes           enable row level security;
alter table public.pagos             enable row level security;
alter table public.eventos_pago      enable row level security;
alter table public.mensajes_operflow enable row level security;
alter table public.avisos_operflow   enable row level security;

revoke all on public.ordenes, public.pagos, public.eventos_pago, public.mensajes_operflow, public.avisos_operflow from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.ordenes, public.pagos, public.eventos_pago, public.mensajes_operflow, public.avisos_operflow from authenticated;

create policy ordenes_ver on public.ordenes for select to authenticated
  using (public.es_gerencia() or (lead_id is not null and public.es_mi_lead(lead_id)));
create policy pagos_ver on public.pagos for select to authenticated
  using (public.es_gerencia() or (lead_id is not null and public.es_mi_lead(lead_id)));
create policy mensajes_operflow_ver on public.mensajes_operflow for select to authenticated
  using (public.es_gerencia() or public.es_mi_lead(lead_id));
create policy eventos_pago_ver on public.eventos_pago for select to authenticated
  using (public.es_gerencia());
-- avisos_operflow: sin políticas; solo el servidor.

-- 6 ── Funciones del servidor ───────────────────────────────────────────────
create function public.etiqueta_tipo_pago(p public.tipo_orden) returns text
language sql immutable set search_path = ''
as $$
  select case p when 'tienda' then 'la tienda' when 'diseno' then 'el diseño'
                when 'anticipo' then 'el anticipo' when 'saldo' then 'el saldo' end
$$;

create function public.pesos_texto(p bigint) returns text
language sql immutable set search_path = ''
as $$
  select '$' || replace(to_char(p, 'FM999G999G999G999'), ',', '.')
$$;

-- ¿Quién puede actuar sobre este lead? Gerencia activa o su asesor activo.
create function public.puede_actuar(p_autor uuid, p_lead uuid, p_solo_gerencia boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = p_autor and p.activo
      and (p.rol = 'gerencia'
           or (not p_solo_gerencia and exists (
                 select 1 from public.leads l where l.id = p_lead and l.asesor_id = p_autor)))
  )
$$;

-- Aplica un pago aprobado al lead (si es el primero de su tipo) y deja el mensaje para Operflow.
create function public.aplicar_pago_aprobado(p_pago_id bigint, p_autor uuid, p_referencia text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago   public.pagos;
  v_lead   public.leads;
  v_previo public.pago_estado;
  v_req    public.pago_estado;
  v_mensaje bigint;
begin
  select * into v_pago from public.pagos where id = p_pago_id for update;
  if v_pago.tipo = 'tienda' then
    update public.pagos set cuenta = true, actualizado_at = now() where id = p_pago_id;
    update public.ordenes set estado = 'aprobada', actualizado_at = now() where id = v_pago.orden_id;
    return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', 'tienda');
  end if;

  select * into v_lead from public.leads where id = v_pago.lead_id for update;
  v_previo := v_lead.pago_estado;
  v_req := case v_pago.tipo when 'diseno' then 'nada' when 'anticipo' then 'diseno' when 'saldo' then 'anticipo' end;

  -- Repetido (ya se pagó ese tipo) o fuera de orden: queda registrado, no cuenta y se avisa.
  if v_previo <> v_req or exists (
       select 1 from public.pagos
       where lead_id = v_pago.lead_id and tipo = v_pago.tipo and cuenta and id <> p_pago_id) then
    update public.pagos set cuenta = false, estado = 'revisar', actualizado_at = now() where id = p_pago_id;
    update public.ordenes set estado = 'repetida', actualizado_at = now() where id = v_pago.orden_id;
    insert into public.actividades (lead_id, autor_id, tipo, detalle)
    values (v_pago.lead_id, p_autor, 'pago',
            'Pago repetido o fuera de orden de ' || public.etiqueta_tipo_pago(v_pago.tipo) || ' por '
            || public.pesos_texto(v_pago.monto) || '. Revisar y devolver si corresponde.');
    return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'repetido', true, 'lead_id', v_pago.lead_id);
  end if;

  update public.pagos set cuenta = true, actualizado_at = now() where id = p_pago_id;
  update public.ordenes set estado = 'aprobada', actualizado_at = now() where id = v_pago.orden_id;

  update public.leads
  set pago_estado = case v_pago.tipo when 'diseno' then 'diseno'::public.pago_estado
                                     when 'anticipo' then 'anticipo'::public.pago_estado
                                     else 'saldo'::public.pago_estado end,
      estado = case
                 when v_pago.tipo = 'diseno' and estado in ('nuevo', 'contactado', 'perdido') then 'diseno_pagado'::public.estado_lead
                 when v_pago.tipo = 'anticipo' then 'aprobado'::public.estado_lead
                 else estado end
  where id = v_pago.lead_id;

  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (v_pago.lead_id, p_autor, 'pago',
          'Pagó ' || public.etiqueta_tipo_pago(v_pago.tipo) || ': ' || public.pesos_texto(v_pago.monto)
          || coalesce(' (' || p_referencia || ')', ''));

  if v_pago.tipo = 'diseno' then
    insert into public.mensajes_operflow (lead_id, mensaje) values (v_pago.lead_id, 'A')
    on conflict do nothing returning id into v_mensaje;
  else
    insert into public.mensajes_operflow (lead_id, mensaje, pago_id) values (v_pago.lead_id, 'C', p_pago_id)
    on conflict do nothing returning id into v_mensaje;
  end if;

  return jsonb_build_object('ok', true, 'nuevo_aprobado', true, 'tipo', v_pago.tipo, 'lead_id', v_pago.lead_id);
end;
$$;

-- Pago informado por Mercado Pago (el servidor ya lo consultó en la API de Mercado Pago).
-- Sin repetidos: el id de pago es único y la orden se bloquea mientras se registra.
create function public.registrar_pago(
  p_orden_id text, p_mp_pago_id bigint, p_estado_mp text, p_monto numeric, p_moneda text,
  p_metodo text, p_detalle text, p_pagado_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_orden  public.ordenes;
  v_estado public.estado_pago;
  v_previo public.estado_pago;
  v_pago   bigint;
begin
  select * into v_orden from public.ordenes where id = p_orden_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'orden_no_existe');
  end if;

  v_estado := case
    when p_estado_mp = 'approved' then 'aprobado'
    when p_estado_mp in ('pending', 'in_process', 'in_mediation', 'authorized') then 'pendiente'
    when p_estado_mp in ('refunded', 'charged_back') then 'devuelto'
    else 'rechazado' end;
  -- Aprobado, pero no cuadra con lo que se cobró: no cuenta.
  if v_estado = 'aprobado' and (p_monto is distinct from v_orden.total_cop::numeric or p_moneda is distinct from 'COP') then
    v_estado := 'revisar';
  end if;

  select id, estado into v_pago, v_previo from public.pagos where mp_pago_id = p_mp_pago_id for update;
  if v_pago is null then
    insert into public.pagos (orden_id, lead_id, tipo, mp_pago_id, estado, estado_mp, detalle, metodo, monto, pagado_at)
    values (p_orden_id, v_orden.lead_id, v_orden.tipo, p_mp_pago_id, v_estado, left(p_estado_mp, 40), left(p_detalle, 200),
            left(p_metodo, 60), greatest(coalesce(round(p_monto), 0), 0)::bigint, p_pagado_at)
    returning id into v_pago;
  else
    if (v_previo in ('aprobado', 'revisar') and v_estado in ('pendiente', 'rechazado'))
       or (v_previo = 'revisar' and v_estado in ('aprobado', 'revisar')) then
      -- Un aviso viejo que llega tarde no deshace un pago aprobado; uno en revisión espera a gerencia.
      return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'sin_cambios', true);
    end if;
    update public.pagos
    set estado = v_estado, estado_mp = left(p_estado_mp, 40), detalle = left(p_detalle, 200),
        metodo = left(p_metodo, 60), pagado_at = coalesce(p_pagado_at, pagado_at), actualizado_at = now()
    where id = v_pago;
  end if;

  if v_estado = 'aprobado' and v_previo is distinct from 'aprobado' then
    return public.aplicar_pago_aprobado(v_pago, null, 'Mercado Pago ' || p_mp_pago_id);
  end if;

  if v_estado = 'revisar' and v_previo is distinct from 'revisar' then
    update public.ordenes set estado = 'revisar', actualizado_at = now() where id = p_orden_id;
    if v_orden.lead_id is not null then
      insert into public.actividades (lead_id, autor_id, tipo, detalle)
      values (v_orden.lead_id, null, 'pago',
              'Mercado Pago aprobó un pago que no cuadra con el cobro (' || coalesce(public.pesos_texto(round(p_monto)::bigint), '?')
              || ' en vez de ' || public.pesos_texto(v_orden.total_cop) || '). Revisar.');
    end if;
  elsif v_estado = 'devuelto' and v_previo = 'aprobado' then
    update public.ordenes set estado = 'devuelta', actualizado_at = now() where id = p_orden_id;
    if v_orden.lead_id is not null then
      insert into public.actividades (lead_id, autor_id, tipo, detalle)
      values (v_orden.lead_id, null, 'pago',
              'Mercado Pago informa que el pago de ' || public.etiqueta_tipo_pago(v_orden.tipo) || ' fue devuelto o reclamado.');
    end if;
  elsif v_estado in ('pendiente', 'rechazado') and v_orden.estado in ('creada', 'pendiente', 'rechazada') then
    update public.ordenes
    set estado = case v_estado when 'pendiente' then 'pendiente'::public.estado_orden else 'rechazada'::public.estado_orden end,
        actualizado_at = now()
    where id = p_orden_id;
  end if;

  return jsonb_build_object('ok', true, 'nuevo_aprobado', false, 'estado', v_estado);
end;
$$;

-- Pago a mano de gerencia (por ejemplo, transferencia). El monto lo calculó el servidor.
create function public.registrar_pago_manual(
  p_lead uuid, p_tipo public.tipo_orden, p_monto bigint, p_autor uuid, p_nota text, p_orden_id text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pago bigint;
begin
  if p_tipo = 'tienda' or not public.puede_actuar(p_autor, p_lead, true) then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if p_monto is null or p_monto <= 0 or length(coalesce(trim(p_nota), '')) not between 1 and 300 then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;
  insert into public.ordenes (id, tipo, lead_id, origen, total_cop, estado, autor_id, nota, items)
  values (p_orden_id, p_tipo, p_lead, 'manual', p_monto, 'creada', p_autor, trim(p_nota),
          jsonb_build_array(jsonb_build_object('title', 'Pago a mano de ' || public.etiqueta_tipo_pago(p_tipo),
                                               'quantity', 1, 'unit_price', p_monto, 'currency_id', 'COP')));
  insert into public.pagos (orden_id, lead_id, tipo, estado, monto, pagado_at, detalle)
  values (p_orden_id, p_lead, p_tipo, 'aprobado', p_monto, now(), 'manual')
  returning id into v_pago;
  return public.aplicar_pago_aprobado(v_pago, p_autor, 'a mano: ' || left(trim(p_nota), 120));
end;
$$;

-- Valor final de la propuesta (o el medido). Lo escribe gerencia mientras Operflow no esté conectado.
create function public.poner_valor_final(p_lead uuid, p_valor bigint, p_medido boolean, p_autor uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead public.leads;
begin
  if not public.puede_actuar(p_autor, p_lead, true) then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 10000000000 then
    return jsonb_build_object('ok', false, 'motivo', 'datos');
  end if;
  select * into v_lead from public.leads where id = p_lead for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  if p_medido then
    if v_lead.pago_estado <> 'anticipo' then return jsonb_build_object('ok', false, 'motivo', 'estado'); end if;
    update public.leads set valor_final_medido = p_valor where id = p_lead;
  else
    if v_lead.pago_estado <> 'diseno' or v_lead.estado not in ('diseno_pagado', 'propuesta_enviada') then
      return jsonb_build_object('ok', false, 'motivo', 'estado');
    end if;
    update public.leads set valor_final = p_valor, estado = 'propuesta_enviada' where id = p_lead;
  end if;
  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (p_lead, p_autor, 'pago',
          case when p_medido then 'Valor final con medidas confirmadas: ' else 'Valor final de la propuesta: ' end
          || public.pesos_texto(p_valor));
  return jsonb_build_object('ok', true);
end;
$$;

-- Aviso de Operflow (mensaje B), ya con la firma revisada por el servidor. Sin repetidos por huella.
create function public.registrar_aviso_operflow(
  p_huella text, p_lead uuid, p_evento text, p_proyecto_id text, p_etapa text, p_estado text,
  p_valor_final bigint, p_url_propuesta text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead public.leads;
begin
  insert into public.avisos_operflow (huella, lead_id, evento) values (p_huella, p_lead, p_evento)
  on conflict do nothing;
  if not found then return jsonb_build_object('ok', true, 'repetido', true); end if;

  select * into v_lead from public.leads where id = p_lead for update;
  if not found or v_lead.pago_estado = 'nada' then
    return jsonb_build_object('ok', false, 'motivo', 'lead_no_existe');
  end if;

  update public.leads
  set operflow_proyecto_id = coalesce(left(p_proyecto_id, 120), operflow_proyecto_id),
      operflow_etapa = coalesce(left(p_etapa, 80), operflow_etapa),
      operflow_estado = case p_evento when 'entregado' then 'entregado'
                                      when 'cancelado_tras_medicion' then 'cancelado'
                                      else coalesce(left(p_estado, 80), operflow_estado) end,
      operflow_url_propuesta = case when p_evento = 'propuesta_lista' and p_url_propuesta ~ '^https://'
                                    then left(p_url_propuesta, 500) else operflow_url_propuesta end,
      valor_final = case when p_evento = 'propuesta_lista' and p_valor_final > 0 and pago_estado = 'diseno'
                         then p_valor_final else valor_final end,
      valor_final_medido = case when p_evento = 'valor_ajustado' and p_valor_final > 0
                                then p_valor_final else valor_final_medido end,
      estado = case when p_evento = 'propuesta_lista' and estado = 'diseno_pagado'
                    then 'propuesta_enviada'::public.estado_lead else estado end
  where id = p_lead;

  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (p_lead, null, 'operflow',
          case p_evento
            when 'propuesta_lista' then 'Operflow: propuesta lista'
                 || case when p_valor_final > 0 then ' por ' || public.pesos_texto(p_valor_final) else '' end
            when 'valor_ajustado' then 'Operflow: valor ajustado tras medir'
                 || case when p_valor_final > 0 then ' a ' || public.pesos_texto(p_valor_final) else '' end
            when 'entregado' then 'Operflow: proyecto entregado'
            when 'cancelado_tras_medicion' then
              'Operflow: cancelado tras la medición. Devolución pendiente: anticipo menos la visita (la hace gerencia en Mercado Pago).'
            else 'Operflow: etapa ' || coalesce(left(p_etapa, 80), '?') || coalesce(' · ' || left(p_estado, 80), '')
          end);
  return jsonb_build_object('ok', true);
end;
$$;

-- Borra los datos personales del cliente de un lead. Las fotos de la cubeta las borra antes el servidor.
--  'no_aprobo': asesor del lead o gerencia; solo si pagó el diseño y nada más. Deja el mensaje E.
--  'borrar'   : solo gerencia. Si nunca pagó, borra el cliente entero; si pagó, borra los datos y
--               conserva lo que la ley pide guardar del pago (producto, ciudad, fechas y pagos).
create function public.borrar_datos_cliente(p_lead uuid, p_autor uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead    public.leads;
  v_cliente uuid;
  v_pagado  boolean;
begin
  if p_motivo not in ('no_aprobo', 'borrar') or not public.puede_actuar(p_autor, p_lead, p_motivo = 'borrar') then
    return jsonb_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  select * into v_lead from public.leads where id = p_lead for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'no_existe'); end if;
  v_cliente := v_lead.cliente_id;
  if p_motivo = 'no_aprobo' and (v_lead.pago_estado <> 'diseno' or v_lead.estado not in ('diseno_pagado', 'propuesta_enviada')) then
    return jsonb_build_object('ok', false, 'motivo', 'estado');
  end if;

  v_pagado := exists (
    select 1 from public.pagos p join public.leads l on l.id = p.lead_id
    where l.cliente_id = v_cliente and p.estado in ('aprobado', 'revisar', 'devuelto'));

  if p_motivo = 'borrar' and not v_pagado then
    delete from public.pagos where lead_id in (select id from public.leads where cliente_id = v_cliente);
    delete from public.ordenes where lead_id in (select id from public.leads where cliente_id = v_cliente);
    delete from public.clientes where id = v_cliente; -- en cascada: leads, notas, fotos (filas) y bandeja
    return jsonb_build_object('ok', true, 'resultado', 'borrado');
  end if;

  -- Operflow: si el proyecto ya existe allá, se le pide borrar; si nunca se envió, ya no se envía.
  update public.mensajes_operflow set estado = 'cancelado', ultimo_error = 'Datos del cliente borrados antes de enviar'
  where lead_id in (select id from public.leads where cliente_id = v_cliente) and estado in ('pendiente', 'fallido');
  insert into public.mensajes_operflow (lead_id, mensaje)
  select l.id, 'E' from public.leads l
  where l.cliente_id = v_cliente
    and exists (select 1 from public.mensajes_operflow m where m.lead_id = l.id and m.mensaje = 'A' and m.estado = 'enviado')
  on conflict do nothing;

  delete from public.actividades where tipo = 'nota' and lead_id in (select id from public.leads where cliente_id = v_cliente);
  delete from public.archivos where lead_id in (select id from public.leads where cliente_id = v_cliente);
  update public.clientes
  set nombre = 'Cliente borrado', telefono = null, email = null, direccion = null, datos_borrados_at = now()
  where id = v_cliente;

  if p_motivo = 'no_aprobo' then
    update public.leads set estado = 'no_aprobo', proximo_contacto = null where id = p_lead;
  else
    update public.leads set proximo_contacto = null where cliente_id = v_cliente;
  end if;
  insert into public.actividades (lead_id, autor_id, tipo, detalle)
  values (p_lead, p_autor, 'cambio_estado',
          case p_motivo when 'no_aprobo' then 'No aprobó: se borraron sus datos personales, fotos y notas'
                        else 'Se borraron los datos personales, fotos y notas del cliente (se conservan los pagos)' end);
  return jsonb_build_object('ok', true, 'resultado', 'anonimizado');
end;
$$;

-- Solo el servidor (llave secreta) ejecuta estas funciones.
revoke execute on function
  public.etiqueta_tipo_pago(public.tipo_orden), public.pesos_texto(bigint),
  public.puede_actuar(uuid, uuid, boolean),
  public.aplicar_pago_aprobado(bigint, uuid, text),
  public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz),
  public.registrar_pago_manual(uuid, public.tipo_orden, bigint, uuid, text, text),
  public.poner_valor_final(uuid, bigint, boolean, uuid),
  public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text),
  public.borrar_datos_cliente(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function
  public.registrar_pago(text, bigint, text, numeric, text, text, text, timestamptz),
  public.registrar_pago_manual(uuid, public.tipo_orden, bigint, uuid, text, text),
  public.poner_valor_final(uuid, bigint, boolean, uuid),
  public.registrar_aviso_operflow(text, uuid, text, text, text, text, bigint, text),
  public.borrar_datos_cliente(uuid, uuid, text)
to service_role;
