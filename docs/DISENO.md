> **DESCARTADO (2026-11-18):** Alberto probó este rediseño y prefirió el diseño anterior. No aplicar. Se guarda solo como registro (ver docs/DECISIONES.md).

# Diseño de Hechomadera (v1 · 2026-11-18)

Inspiración: awesomic.com. Guía completa de la referencia: `docs/DISENO-REFERENCIA.md`.
Tokens en `tailwind.config.ts`; clases comunes en `app/globals.css` (`@layer components`).

## Regla de oro: los textos no se tocan
Cada frase de la web pasó por un filtro de tono y contenido. **No se cambia, no se borra ni se agrega texto visible** (tampoco `alt`, `aria-label` ni `title`). Se permite reordenar bloques, cambiar la estructura HTML y los estilos. Se verifica comparando el texto renderizado de cada página antes y después.

## Sistema
- **Paleta:** zinc casi monocromático. Fondo `bg-paper` (#f4f4f5), tarjetas `bg-snow` (#fff), texto `text-ink` (#09090b) y `text-graphite`; secundario `text-ink-muted` (#52525b); ayuda `text-ink-soft` (#71717a); bordes `border-cloud` (#ececee).
- **Acento único:** `ember` (#ff5a00), solo en etiquetas pequeñas (`.etiqueta-ember`). Nunca en textos largos, enlaces ni fondos grandes. No agregar otros colores.
- **Tipografía:** una sola familia (DM Sans). Titulares en peso 600, apretados (`.titulo-display`, `.titulo-seccion`, `.titulo-tarjeta`). Texto normal 14–15px. Etiquetas superiores con `.eyebrow`.
- **Geometría:** tarjetas `rounded-card` (36px), botones y campos `rounded-button` / `rounded-input` (14px), etiquetas `rounded-badge` (12px), píldoras `rounded-full`. Nada con esquinas rectas visibles.
- **Elevación:** bordes de 1px `border-cloud`, sin sombras en tarjetas. Solo el botón primario lleva su sombra interna (`shadow-boton`).
- **Ritmo:** contenedor `.contenedor` (máx. 1200px), secciones `.seccion` (80px en escritorio), relleno de tarjeta `p-7` (28px), separación entre elementos 8–16px.
- **Imágenes:** con esquinas `rounded-card` o `rounded-section`, sin filtros ni capas oscuras salvo que el texto encima lo necesite.

## Clases listas
| Clase | Uso |
| --- | --- |
| `.contenedor`, `.seccion` | Ancho y ritmo de cada sección |
| `.eyebrow` | Rótulo pequeño en mayúsculas sobre un título |
| `.titulo-display`, `.titulo-seccion`, `.titulo-tarjeta` | Titulares (h1, h2, h3) |
| `.tarjeta`, `.tarjeta-suave`, `.bloque-oscuro` | Superficies (blanca, gris muy claro, oscura) |
| `.boton-primario` | Acción principal (negro) |
| `.boton-neutro` | Acción secundaria sobre fondo claro |
| `.boton-borde` | Acción con borde |
| `.boton-claro` | Acción sobre fondo oscuro |
| `.boton-pill` | Se suma a un botón para hacerlo píldora (navegación) |
| `.etiqueta`, `.etiqueta-llena`, `.etiqueta-ember` | Etiquetas |
| `.campo` | Campos de formulario |

## Patrones de la referencia que usamos
- Hero con titular grande alineado a la izquierda y la acción a un lado.
- Tarjetas numeradas (01, 02, 03…) con etiquetas abajo.
- Fila de cifras grandes con su descripción corta.
- Bloque oscuro (`.bloque-oscuro`) para contrastar, por ejemplo la llamada final.
- Imagen grande como respiro entre secciones, con esquinas redondeadas.
