# Si la web en Vercel no muestra los últimos cambios

## 1) Confirmar que GitHub tiene el código nuevo

En GitHub: repo → último commit en `main` debe ser el mensaje reciente (ej. formulario contacto).

## 2) Confirmar que Vercel desplegó ese commit

1. **vercel.com** → proyecto **hechomadera-web** → **Deployments**.
2. El deploy **más arriba** (más reciente) debe mostrar el **mismo commit** que GitHub (mismas primeras letras del hash o mensaje del commit).
3. Si el último deploy es **viejo**: **Deployments** → **⋯** en el último → **Redeploy** *o* en **Git** comprobar que el proyecto está conectado al repo correcto y rama `main`.

## 3) Protección de despliegues (Deployment Protection)

Si está activada, a veces verás pantalla de login de Vercel en lugar del sitio.

- **Settings** → **Deployment Protection** → revisar si **Production** está protegido.
- Para pruebas públicas, desactivar protección en producción o usar **Bypass** según documentación de Vercel.

## 4) Abrir la URL desde el último deploy

En la tarjeta del deploy **verde** y reciente, haz clic en **Visit** / dominio. No uses un bookmark viejo de otro proyecto.

## 5) Página Contacto

En `/contacto` debe aparecer al final una línea pequeña **Build: xxxxxxx** (hash del commit en Vercel). Si no aparece o el hash no coincide con GitHub, no estás viendo el deploy nuevo.
