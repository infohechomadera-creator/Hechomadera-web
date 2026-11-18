# Hito W0 · Kit técnico y limpieza
> Diario del hito. Se agrega información; no se borra.

## 2026-11-18
**Hecho**
- Etiqueta local `respaldo-2026-11-18-pre-kit` antes de cambiar nada.
- Creado el kit del estándar: `CLAUDE.md`, `.claude/settings.json` (allow nivel 2, ask para borrados y comandos de riesgo, deny del estándar, hook), `.claude/hooks/revisar-secretos.sh`, agentes `validador`, `archivista`, `auditor`, skills `retomar` y `cierre`.
- Documentos base: `PRODUCTO.md`, `PLAN.md`, `docs/ESTADO.md`, `docs/DECISIONES.md`, `docs/REFERENCIA.md`, este diario.
- `.gitignore`: `.env*` (excepto `.env.example`) y `respaldos/`.
- `.claude/settings.local.json`: quitados `curl`, `python3`, `node`, `git rm`, `pip3 install`, `npx` externos, la ruta vieja y los duplicados.
- `docs/MIGRACION.md`: la mención a Cursor pasa a Claude Code (única mención encontrada fuera del traspaso).
- Se suben a git `docs/TRASPASO-MOMENTO-1.md` y `docs/CONTRATO-INTEGRACION.md`.

**Aprendido**
- El hook del estándar se bloquearía a sí mismo (su archivo contiene los patrones). Se ajustó: revisa solo líneas agregadas y excluye su propio archivo. Evitar escribir en docs los nombres literales de llaves de Supabase con privilegios.
- `.claude/settings.local.json` ya está fuera de git por la configuración global del usuario.
- La carpeta real es `Desktop/HECHOMADERA`, no la del traspaso.

**Pendientes**
- Alberto: confirmar métricas de conversión objetivo (PRODUCTO.md).
- W1: Alberto crea el proyecto de Supabase.

**Commits**
- Ver `git log respaldo-2026-11-18-pre-kit..hito-0`.
