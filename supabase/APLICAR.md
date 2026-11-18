# Cómo aplicar la base de datos en Supabase (proyecto "hechomadera")

Lo hace Alberto (requiere iniciar sesión en Supabase). Toma unos 5 minutos.

## 1. Aplicar las migraciones (una sola vez, en orden)
> **Hecho el 2026-11-18** por Claude desde Chrome (proyecto Hechomadera, ref `seazgghpynhflxvrjpee`): las 3 migraciones y la semilla, verificadas.

En Supabase → **SQL Editor** → **New query**, pega y ejecuta (**Run**) cada archivo, en este orden:
1. `supabase/migrations/20261118000100_w1_base.sql` (usuarios, clientes, leads, actividades y permisos)
2. `supabase/migrations/20261118000200_w2_precios.sql` (tabla de precios por ciudad)
3. `supabase/migrations/20261118000300_w2_vista_precios_sin_publico.sql` (cierra la vista al público)
4. `supabase/semillas/precios_ejemplo.sql` (precios de ejemplo de Barranquilla y Santa Marta)

Si alguno da error, no sigas: copia el mensaje y pásaselo a Claude.

## 2. Copiar las llaves
En Supabase → **Project Settings** → **API Keys** (y **Data API** para la URL):
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = Publishable key
- `SUPABASE_SECRET_KEY` = Secret key (**nunca** se comparte ni se pega en el chat)

Pégalas en:
- `.env.local` de esta carpeta (Claude no lo lee).
- Vercel → proyecto → Settings → Environment Variables (Preview y Production).

## 3. Crear el primer usuario de gerencia
1. Supabase → **Authentication** → **Users** → **Add user** → tu correo y una contraseña tuya.
2. SQL Editor, cambiando el correo:
   ```sql
   insert into public.perfiles (id, rol, nombre, email)
   select id, 'gerencia', 'Alberto', email from auth.users where email = 'TU_CORREO';
   ```

## 4. Avisar a Claude
Con eso, Claude conecta el login de gerencia y asesor y reemplaza el token único del admin.

> Las pruebas de permisos (`npm test`) corren sobre una base local que imita Supabase; no tocan la base real.
