# Epix — Design System (DESIGN.md)

> **Origen:** adaptación para Epix desde [Open Design](https://github.com/nexu-io/open-design).
> **Base:** *Spotify* (contenido-primero en oscuro, geometría pill/círculo, tipografía bold/regular).
> **Disciplina editorial:** *Runway* (UI invisible, títulos comprimidos, labels uppercase, imágenes como interfaz).
> **Craft aplicado:** `anti-ai-slop`, `color`, `state-coverage`, `animation-discipline`, `accessibility-baseline`.
> **Override de marca (deliberado):** acento violeta **Epix `#6C4CF1`** en lugar del verde de Spotify.

---

## 1. Principios

1. **El contenido es el color.** Los pósters y stills de TVmaze aportan toda la riqueza cromática; la UI se retira.
2. **Oscuro por defecto, claro soportado.** Inmersión cinematográfica; el tema claro es una variante digna, no la principal.
3. **Un solo acento.** `--accent` es funcional (CTA, activo, foco). Máximo **2 usos visibles por pantalla**.
4. **Geometría táctil.** Pills y círculos; nada de esquinas duras en controles.
5. **Nunca un estado vacío.** Toda superficie que carga datos renderiza 5 estados (ver §7).
6. **Microcopy con voz.** «Tu lista te espera» > «No hay elementos».
7. **80 % patrones probados + 20 % decisión propia** (anti-slop): aquí el 20 % es el scrim cinematográfico sobre pósters y el "pop" del corazón de favoritos.

## 2. Tokens de color

### Tema oscuro (default)

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#0E0D13` | Fondo de página (negro con tinte violeta, no puro) |
| `--surface` | `#16151D` | Tarjetas, header, bottom nav |
| `--surface-2` | `#1E1D27` | Inputs, botones secundarios, skeletons |
| `--fg` | `#F2F1F6` | Texto principal (no blanco puro) |
| `--muted` | `#A9A7B5` | Texto secundario, metadatos |
| `--border` | `rgba(255,255,255,0.08)` | Estructura sin ruido (semi-transparente) |
| `--accent` | `#6C4CF1` | Fills, activo, foco (contraste 3.5:1 → solo ≥18.5px bold, UI o fills) |
| `--accent-hover` | `#7D5FF5` | Hover del acento |
| `--accent-soft` | `rgba(108,76,241,0.16)` | Fondos sutiles, focus ring |
| `--accent-text` | `#B9A5FF` | **Texto** con acento sobre oscuro (8.9:1 ✓) |
| `--success` | `#1ED760` | Éxito/positivo |
| `--warning` | `#FFA42B` | Advertencia, banner offline |
| `--danger` | `#F3727F` | Errores |
| `--shadow-card` | `rgba(0,0,0,0.35) 0 8px 16px` | Elevación de tarjetas |
| `--shadow-dialog` | `rgba(0,0,0,0.5) 0 8px 24px` | Modales y menús |

### Tema claro

| Token | Valor |
| --- | --- |
| `--bg` | `#FAFAFC` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#F1F0F5` |
| `--fg` | `#141218` |
| `--muted` | `#5D5B68` |
| `--border` | `rgba(20,18,24,0.10)` |
| `--accent` / `--accent-text` | `#6C4CF1` (5.1:1 ✓) |

**Contrastes de referencia:** `--fg` sobre `--bg` ≈ 15:1 · `--muted` sobre `--surface` ≥ 4.5:1 · acento como fill con texto blanco ≈ 5.3:1. No usar `--accent` como color de texto pequeño sobre oscuro (usar `--accent-text`).

## 3. Tipografía

- **Familia única (sistema, offline-first):** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Binarismo 700/400** (500–600 excepcional). La jerarquía se logra por peso y color, no por tamaño.
- **Escala compacta (app, no landing):**

| Rol | Tamaño | Peso | Tracking / notas |
| --- | --- | --- | --- |
| Display (títulos de pantalla) | 28px | 800 | -0.02em, line-height 1.05 |
| H1 sección | 22–24px | 700 | -0.01em |
| H2 / feature | 18px | 600 | line-height 1.3 |
| Body | 16px | 400 | line-height 1.5 |
| Secundario / metadatos | 14px | 400–700 | `--muted` |
| Micro / caption | 12px | 500 | |
| Label uppercase (botones, eyebrows) | 11–12px | 700 | tracking 1.4px, `text-transform: uppercase` |

- **Line-clamp obligatorio:** títulos de tarjeta a 2 líneas; nunca romper layout con títulos de 200 caracteres.

## 4. Geometría, espaciado y elevación

- **Radios:** pills 9999px (botones, chips, buscador) · tarjetas 12px · sheets/modales 20px · avatares y controles circulares 50 %.
- **Espaciado:** base 4/8px; densidad compacta (es una app). Padding de pantalla 16px.
- **Elevación en oscuro:** sombras fuertes (0.35–0.5 de opacidad) + bordes `rgba(255,255,255,0.08)`; jamás bordes grises sólidos.
- **Scrim de póster (único gradiente permitido):** `linear-gradient(transparent, rgba(14,13,19,0.85))` para legibilidad del texto sobre imagen.

## 5. Componentes (specs de referencia)

- **ShowCard:** póster 2:3 radio 12 · scrim inferior · título 15px/700 (2 líneas) · meta 13px `--muted` (año · género) · rating como pill `rgba(255,255,255,0.12)` con ★ y blur · sin borde · hover: sombra card + leve elevación; press: `scale(.97)`.
- **BottomNav:** fondo `--surface` con blur y borde superior `--border`; 5 destinos; activo = ícono+label en `--fg` con ícono `--accent-text`; inactivo `--muted`; altura 60px + `safe-bottom`; targets ≥ 44px.
- **AppHeader:** translúcido con blur; título display; avatar circular 36px.
- **SearchInput:** pill `--surface-2`; icono lupa 20px `--muted`; focus: anillo `--accent-soft` + borde `--accent`; botón limpiar circular 32px.
- **Botones:** primario = pill `--accent` + texto blanco 12/700 uppercase tracking 1.4px; secundario = pill `--surface-2` + `--fg`; icónicos = círculo 44px `--surface-2`.
- **Chips de género:** pill outline `--border`, 12px/500, `--muted`.
- **Skeleton:** `--surface-2` con `animate-pulse`; **nunca** spinner en listas. Spinner solo en acciones puntuales (guardar, sincronizar).
- **EmptyState:** ícono monoline 1.7px `--muted` + título 16/700 + descripción 14 `--muted` + CTA pill (si aplica).
- **ErrorState:** causa en lenguaje claro + botón «Reintentar»; conserva el input del usuario.
- **OfflineBanner:** barra fina `--warning` al 12 % de fondo con texto 12/600, bajo el header.

## 6. Movimiento

- **Default 150 ms** `cubic-bezier(0.2, 0, 0, 1)` para confirmación de estado.
- 50–100 ms: press/hover/toggle. 200–220 ms: entradas (sheets, menús). 300 ms: transiciones entre pantallas.
- Móvil: 20–30 % más corto que escritorio.
- **Micro-interacción memorable:** corazón de favorito con "pop" (scale 1 → 1.15 → 1, ~200 ms) al marcar.
- `prefers-reduced-motion`: solo opacidad, sin desplazamientos.

## 7. Estados obligatorios (state-coverage)

Toda superficie que carga datos debe renderizar los **5 estados**; solo el "populated" es el error clásico.

| Estado | Regla Epix |
| --- | --- |
| Loading | Skeleton fiel a la forma; si tarda > 8 s, texto «Está tardando más de lo normal…» |
| Empty | Título + explicación + CTA. Búsqueda sin resultados **repite la consulta** y sugiere acortarla |
| Error | Qué pasó + por qué (si se sabe) + acción (Reintentar). Nunca «algo salió mal» |
| Populated | El caso dibujado |
| Edge | Título 200+ chars (line-clamp), sin imagen (placeholder con inicial), sin rating (omitir pill), 1000 resultados (contador + scroll), query de 1 carácter (no dispara) |

## 8. Accesibilidad (WCAG 2.2 AA)

- Contraste: 4.5:1 texto normal · 3:1 texto grande/UI.
- Touch targets ≥ 44×44 px (área táctil aunque el ícono sea 24px).
- Foco visible: anillo 2px `--accent` + offset 2px, nunca `outline: none` sin reemplazo.
- Pósters con `alt` = nombre de la serie; búsqueda con `aria-live="polite"` en el contador de resultados.
- Estado nunca solo por color: el favorito añade también el cambio de forma del ícono.

## 9. Anti-slop (checklist de revisión)

- [ ] Íconos: SVG monoline 1.6–1.8 stroke `currentColor`; **cero emojis** como íconos de UI.
- [ ] Cero indigos por defecto (`#6366f1`, `#4f46e5`…): el acento es `#6C4CF1`.
- [ ] Cero gradientes decorativos; solo el scrim de póster.
- [ ] Máximo 2 usos visibles de `--accent` por pantalla.
- [ ] Sin métricas inventadas: todos los datos vienen de TVmaze.
- [ ] Sin placeholders externos (picsum/unsplash): póster real o placeholder de marca.
- [ ] Microcopy real en español, con voz.

## 10. Referencias

- Open Design — design systems: `spotify`, `runwayml`. Craft: `anti-ai-slop`, `color`, `state-coverage`, `animation-discipline`, `accessibility-baseline`.
- W3C. (2024). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
- Material Design 3 — motion tokens · Apple HIG — Touch targets 44 pt.
