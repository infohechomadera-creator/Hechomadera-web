-- W3 · Configurador guiado: fotos del espacio y envío sin duplicados.
--  - `leads.envio_id`: identificador que manda el navegador; si el cliente toca "Enviar" dos veces,
--    el segundo envío no crea otro lead.
--  - `archivos`: fotos del espacio de cada lead. Solo el servidor (llave secreta) las registra.
--  - Cubeta `fotos-espacio` PRIVADA y sin políticas en storage.objects: nadie con la llave pública
--    puede subir, listar ni leer. El servidor sube y entrega enlaces firmados de vida corta.

alter table public.leads add column envio_id uuid unique;

create table public.archivos (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  ruta       text not null unique check (ruta ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  tipo       text not null check (tipo in ('image/jpeg', 'image/png', 'image/webp')),
  bytes      integer not null check (bytes between 1 and 5242880),
  creado_at  timestamptz not null default now()
);

create index archivos_lead_idx on public.archivos (lead_id);

alter table public.archivos enable row level security;
revoke all on public.archivos from anon;
revoke truncate, references, trigger on public.archivos from authenticated;

-- Gerencia ve todas; el asesor solo las de sus leads. Sin políticas de escritura: solo el servidor.
create policy archivos_ver on public.archivos for select to authenticated
  using (public.es_gerencia() or public.es_mi_lead(lead_id));

-- Cubeta privada: 5 MB por archivo, solo imágenes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-espacio', 'fotos-espacio', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
