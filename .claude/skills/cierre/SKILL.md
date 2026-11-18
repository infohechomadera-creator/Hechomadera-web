---
name: cierre
description: Cierra un hito o una sesión de Hechomadera-web sin perder información: revisa, audita, documenta, guarda y avisa. Usar al terminar un hito, al pausar, cuando la conversación sea larga o con "cierre", "guardemos", "terminemos por hoy".
---
1. **Revisar:** `git status --short` y commits desde la última etiqueta. En cierre de hito: pruebas, build y lint sin errores, pantallas probadas y `validador` sin problemas reales pendientes.
2. **Auditar:** pide al agente `auditor` que revise la sesión. Corrige las desviaciones que quepan en el nivel actual; las demás se presentan a Alberto.
3. **Documentar:** resumen corto al agente `archivista` (hecho, a medias, decisiones con motivo, problemas y solución, pendientes, siguiente paso exacto). Revisa con `git diff` que no se borró nada útil.
4. **Guardar (según nivel):** commit con "(hito N)"; si el nivel lo permite, push y etiqueta `hito-N` en cierre de hito.
5. **Memoria:** si apareció algo sobre cómo prefiere trabajar Alberto (no sobre el proyecto), guárdalo en la memoria de Claude.
6. **Avisar:** en español simple, qué quedó guardado, dónde y el siguiente paso. Si se cerró un hito, propón seguir en una sesión nueva.
