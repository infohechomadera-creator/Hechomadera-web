---
name: retomar
description: Al empezar una sesión de Hechomadera-web. Lee docs/ESTADO.md, revisa git y resume dónde vamos y qué sigue. Usar con "retomar", "dónde quedamos", "sigamos" o al abrir una sesión nueva.
---
1. Lee solo `docs/ESTADO.md`.
2. Un comando: `git status --short && git log --oneline -5 && git describe --tags --abbrev=0`. Si hay cambios sin guardar o sin subir, dilo.
3. Recuerda el nivel de autonomía actual (de `CLAUDE.md`).
4. Responde en máximo 10 líneas: **Dónde vamos**, **Siguiente paso**, **Pendientes importantes** (máx. 3), **Lo que necesito de ti**.
5. Si toca empezar un hito, lee su fila en `PLAN.md` y las decisiones relacionadas, y propón el plan del hito en modo plan.
