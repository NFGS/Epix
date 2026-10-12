---
name: Epix Stream
description: Sistema de diseño de Epix — streaming oscuro contenido-primero con acento azul vivo y afecto rosa; Poppins para display/UI y Lato para cuerpo.
colors:
  accent-blue: "#2563EB"
  accent-blue-hover-dark: "#2D6BE8"
  accent-blue-hover-light: "#1D4ED8"
  accent-blue-text-dark: "#6EA8FF"
  accent-blue-text-light: "#1D4ED8"
  affection-magenta-dark: "#EC4899"
  affection-magenta-light: "#DB2777"
  rating-star-dark: "#FACC15"
  rating-star-light: "#B45309"
  carbon-bg-dark: "#0B0B10"
  carbon-surface-dark: "#14141B"
  carbon-surface-2-dark: "#1D1D26"
  mist-fg-dark: "#F5F5F7"
  mist-muted-dark: "#A7A7B6"
  paper-bg-light: "#F6F7FB"
  paper-surface-light: "#FFFFFF"
  paper-surface-2-light: "#EDEFF5"
  ink-fg-light: "#10131F"
  ink-muted-light: "#545A6E"
  success-green-dark: "#1ED760"
  warning-amber-dark: "#FFA42B"
  danger-rose-dark: "#F3727F"
typography:
  display:
    fontFamily: "Poppins, Lato, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, Lato, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Lato, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Poppins, Lato, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "1.4px"
rounded:
  pill: "9999px"
  card: "12px"
  sheet: "20px"
spacing:
  base: "4px"
  screen: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.carbon-surface-2-dark}"
    textColor: "{colors.mist-fg-dark}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
  chip-selected:
    backgroundColor: "{colors.accent-blue}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  rating-badge:
    backgroundColor: "rgba(0, 0, 0, 0.55)"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  favorite-heart-active:
    backgroundColor: "rgba(0, 0, 0, 0.5)"
    textColor: "{colors.affection-magenta-dark}"
    rounded: "{rounded.pill}"
    size: "44px"
---

# Epix — Design System «Epix Stream» (DESIGN.md)

> **Origen:** identidad visual propia derivada de las referencias del owner
> ([`muestra-1.webp`](./referencias/muestra-1.webp) y [`muestra-2.webp`](./referencias/muestra-2.webp),
> mockup de plataforma de streaming oscura + Style Guide explícito).
> **Base:** contenido-primero en negro/carbón, acento **azul vivo** para acción/activo,
> **rosa magenta** reservado al afecto (favoritos), tipografía **Poppins** (display/UI) × **Lato** (cuerpo).
> **Craft aplicado:** `anti-ai-slop`, `color`, `state-coverage`, `animation-discipline`, `accessibility-baseline`.
> **Precedencia:** este documento es la fuente de verdad visual; el oráculo Material (`google-design`)
> validó roles y contrastes pero no impone identidad.

---

## 1. Principios

1. **El contenido es el color.** Los pósters y stills de TVmaze aportan la riqueza cromática; la UI se retira a negros con tinte azul.
2. **Oscuro por defecto, claro soportado.** Inmersión de sala de cine; el tema claro es una variante digna, no la principal.
3. **Un acento funcional: el azul.** `--accent` es acción (CTA, chips activos, foco, nav activa). Máximo **2 usos visibles por pantalla**.
4. **El rosa es afecto, no decoración.** `--secondary` solo existe donde hay amor: el corazón de favoritos activo. Nunca en botones ni texto.
5. **Geometría táctil.** Pills y círculos; nada de esquinas duras en controles.
6. **Nunca un estado vacío.** Toda superficie que carga datos renderiza 5 estados (ver §7).
7. **Microcopy con voz.** «Tu lista te espera» > «No hay elementos».
8. **80 % patrones probados + 20 % decisión propia** (anti-slop): aquí el 20 % es el badge de rating con estrella dorada sobre cristal oscuro y el "pop" rosa del corazón.

## 2. Tokens de color

### Tema oscuro (default)

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#0B0B10` | Fondo de página (negro carbón con tinte azul, no puro) |
| `--surface` | `#14141B` | Tarjetas, header, bottom nav |
| `--surface-2` | `#1D1D26` | Inputs, botones secundarios, skeletons |
| `--fg` | `#F5F5F7` | Texto principal (blanco niebla, no puro) |
| `--muted` | `#A7A7B6` | Texto secundario, metadatos |
| `--border` | `rgba(255,255,255,0.08)` | Estructura sin ruido (semi-transparente) |
| `--accent` | `#2563EB` | Fills de acción: CTA, chips activos, switch, foco (blanco sobre él 5.2:1 ✓) |
| `--accent-hover` | `#2D6BE8` | Hover del acento en oscuro (blanco sobre él 4.8:1 ✓) |
| `--accent-soft` | `rgba(59,130,246,0.18)` | Fondos sutiles, focus ring |
| `--accent-text` | `#6EA8FF` | **Texto**/íconos activos con azul sobre oscuro (8.1:1 ✓) |
| `--secondary` | `#EC4899` | Corazón de favoritos activo — gráfico de afecto (5.5:1 sobre bg ✓) |
| `--star` | `#FACC15` | Estrella dorada del badge de rating (≈11:1 sobre cristal oscuro ✓) |
| `--success` | `#1ED760` | Éxito/positivo |
| `--warning` | `#FFA42B` | Advertencia, banner offline (9.9:1 ✓) |
| `--danger` | `#F3727F` | Errores |
| `--shadow-card` | `rgba(0,0,0,0.4) 0 8px 16px` | Elevación de tarjetas |
| `--shadow-dialog` | `rgba(0,0,0,0.55) 0 8px 24px` | Modales y menús |

### Tema claro

| Token | Valor |
| --- | --- |
| `--bg` | `#F6F7FB` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#EDEFF5` |
| `--fg` | `#10131F` |
| `--muted` | `#545A6E` |
| `--border` | `rgba(16,19,31,0.10)` |
| `--accent` / `--accent-text` | `#2563EB` / `#1D4ED8` |
| `--accent-hover` | `#1D4ED8` |
| `--secondary` | `#DB2777` |
| `--star` | `#B45309` |

### Contrastes de referencia (WCAG 2.2 AA, calculados)

| Par (oscuro) | Ratio | Par (claro) | Ratio |
| --- | --- | --- | --- |
| `--fg` sobre `--bg` | 18.0:1 ✓ | `--fg` sobre `--bg` | 17.4:1 ✓ |
| `--fg` sobre `--surface` | 16.8:1 ✓ | `--muted` sobre `--surface` | 6.9:1 ✓ |
| `--muted` sobre `--surface` | 7.7:1 ✓ | `--accent` como texto | 5.2:1 ✓ |
| `--muted` sobre `--surface-2` | 7.0:1 ✓ | `--accent-text` sobre `--bg` | 6.4:1 ✓ |
| blanco sobre `--accent` (fill CTA) | 5.2:1 ✓ | `--secondary` como gráfico | 4.4:1 ✓ (≥3:1) |
| `--accent-text` sobre `--bg` | 8.1:1 ✓ | `--star` sobre blanco | 5.0:1 ✓ |
| `--accent` sobre `--bg` | 3.8:1 (solo UI ≥3:1, no texto pequeño) | | |
| `--secondary` sobre `--bg` | 5.5:1 ✓ (gráfico) | | |
| `--star` sobre cristal `bg-black/55` | ≈11:1 ✓ | | |

**Reglas de uso:** no usar `--accent` como color de texto pequeño sobre oscuro (usar `--accent-text`).
`--secondary` es exclusivamente gráfico (ícono corazón); como fill con texto usar `#DB2777` (4.6:1 con blanco).
El badge de rating siempre lleva cristal oscuro (`bg-black/55` + blur) para que la estrella dorada y el número
blanco contrasten con independencia del póster detrás.

## 3. Tipografía

- **Dos voces autohospedadas** (offline-first, `public/fonts/`, woff2 subset latin, `font-display: swap`):
  - **Poppins** (500/600/700/800) — display/UI: títulos de pantalla y sección, botones, chips, labels uppercase. Geométrica pura (círculos), monolinear, x-height alta: la voz "plataforma".
  - **Lato** (400/700) — cuerpo: párrafos, resúmenes, metadatos, episodios. Humanista, "seria pero amable": la voz de lectura.
  - **Presupuesto total: ~78 KB** (Poppins ≈ 7.8 KB ×4, Lato ≈ 23 KB ×2). Preload de Poppins 700/800 en `index.html`.
  - *Excepción documentada (overused-font):* Lato está **anclada por el Style Guide del owner** (muestra-2: "Text: Poppins y Lato"); es decisión de marca, no un default del agente.
- **Asignación por elemento** (no por clase suelta): `h1–h4` y `button` heredan Poppins vía base CSS (`--font-display`); el resto del cuerpo va en Lato (`--font-sans`). El brand de cabecera usa la utilidad `font-display`.
- **Binarismo 700/400** (500–600 en chips y secciones). La jerarquía se logra por peso y color, no por tamaño.

| Rol | Fuente | Tamaño | Peso | Tracking / notas |
| --- | --- | --- | --- | --- |
| Display (títulos de pantalla) | Poppins | 28px | 800 | -0.02em, line-height 1.05 |
| H1 sección | Poppins | 22–24px | 700 | -0.01em |
| H2 / feature | Poppins | 18px | 600 | line-height 1.3 |
| Body | Lato | 16px | 400 | line-height 1.5 |
| Secundario / metadatos | Lato | 14px | 400–700 | `--muted` |
| Micro / caption | Lato | 12px | 500 | |
| Label uppercase (botones, eyebrows) | Poppins | 11–12px | 700 | tracking 1.4px, `text-transform: uppercase` |

- **Line-clamp obligatorio:** títulos de tarjeta a 2 líneas; nunca romper layout con títulos de 200 caracteres.

## 4. Geometría, espaciado y elevación

- **Radios:** pills 9999px (botones, chips, buscador, badges) · tarjetas 12px · sheets/modales 20px · avatares y controles circulares 50 %.
- **Espaciado:** base 4/8px; densidad compacta (es una app). Padding de pantalla 16px.
- **Elevación en oscuro:** sombras profundas (0.4–0.55 de opacidad) + bordes `rgba(255,255,255,0.08)`; jamás bordes grises sólidos.
- **Scrim de póster (único gradiente permitido):** `linear-gradient(transparent, rgba(11,11,16,0.88))` para legibilidad del texto sobre imagen; hero `rgba(11,11,16,0.92)`.

## 5. Componentes (specs de referencia)

- **ShowCard:** póster 2:3 radio 12 · scrim inferior · título 15px/700 Poppins (2 líneas) · meta 13px Lato `--muted` (año · género) · rating como **cristal oscuro** (`bg-black/55` + blur) con **estrella dorada `--star`** y número blanco · sin borde · hover: sombra card + leve elevación; press: `scale(.97)`.
- **BottomNav:** fondo `--surface` con blur y borde superior `--border`; 5 destinos; **activo = ícono + label en `--accent-text`** (azul, como la referencia); inactivo `--muted`; altura 60px + `safe-bottom`; targets ≥ 44px.
- **AppHeader:** translúcido con blur; título display (brand en Poppins 800); avatar circular 36px.
- **SearchInput:** pill `--surface-2`; icono lupa 20px `--muted`; focus: anillo `--accent-soft` + borde `--accent`; botón limpiar circular 32px.
- **Botones:** primario = pill `--accent` + texto blanco 12/700 Poppins uppercase tracking 1.4px; secundario = pill `--surface-2` + `--fg`; icónicos = círculo 44px `--surface-2`.
- **Chips de género:** pill outline `--border`, 12px/500 Poppins, `--muted`; **activo: fill `--accent` + blanco** (grupo de chips activos = un único uso visible del acento).
- **Corazón de favoritos:** círculo 44px `bg-black/50` + blur sobre el póster; inactivo = trazo blanco; **activo = fill `--secondary` (rosa magenta)** con "pop" (scale 1 → 1.15 → 1, ~200 ms).
- **Skeleton:** `--surface-2` con `animate-pulse`; **nunca** spinner en listas. Spinner solo en acciones puntuales (guardar, sincronizar).
- **EmptyState:** ícono monoline 1.7px `--muted` + título 16/700 Poppins + descripción 14 Lato `--muted` + CTA pill (si aplica).
- **ErrorState:** causa en lenguaje claro + botón «Reintentar»; conserva el input del usuario.
- **OfflineBanner:** barra fina `--warning` al 12 % de fondo con texto 12/600, bajo el header.

## 6. Movimiento

- **Default 150 ms** `cubic-bezier(0.2, 0, 0, 1)` para confirmación de estado.
- 50–100 ms: press/hover/toggle. 200–220 ms: entradas (sheets, menús). 300 ms: transiciones entre pantallas.
- Móvil: 20–30 % más corto que escritorio.
- **Micro-interacción memorable:** corazón de favoritos con "pop" rosa (scale 1 → 1.15 → 1, ~200 ms) al marcar.
- `prefers-reduced-motion`: solo opacidad, sin desplazamientos.

## 7. Estados obligatorios (state-coverage)

Toda superficie que carga datos debe renderizar los **5 estados**; solo el "populated" es el error clásico.

| Estado | Regla Epix |
| --- | --- |
| Loading | Skeleton fiel a la forma; si tarda > 8 s, texto «Está tardando más de lo normal…» |
| Empty | Título + explicación + CTA. Búsqueda sin resultados **repite la consulta** y sugiere acortarla |
| Error | Qué pasó + por qué (si se sabe) + acción (Reintentar). Nunca «algo salió mal» |
| Populated | El caso dibujado |
| Edge | Título 200+ chars (line-clamp), sin imagen (placeholder con inicial), sin rating (omitir badge), 1000 resultados (contador + scroll), query de 1 carácter (no dispara) |

## 8. Accesibilidad (WCAG 2.2 AA)

- Contraste: 4.5:1 texto normal · 3:1 texto grande/UI (ver tabla §2).
- Touch targets ≥ 44×44 px (área táctil aunque el ícono sea 24px).
- Foco visible: anillo 2px `--accent` + offset 2px, nunca `outline: none` sin reemplazo.
- Pósters con `alt` = nombre de la serie; búsqueda con `aria-live="polite"` en el contador de resultados.
- Estado nunca solo por color: el favorito añade también el cambio de forma del ícono (trazo → fill rosa).

## 9. Anti-slop (checklist de revisión)

- [ ] Íconos: SVG monoline 1.6–1.8 stroke `currentColor`; **cero emojis** como íconos de UI.
- [ ] Cero azules Tailwind por defecto en texto pequeño sobre oscuro (`#3B82F6` como texto falla AA con blanco encima; el fill canónico es `#2563EB`).
- [ ] Cero gradientes decorativos; solo el scrim de póster y el gradiente del favicon.
- [ ] Máximo 2 usos visibles de `--accent` por pantalla; `--secondary` (rosa) solo en el corazón.
- [ ] Sin métricas inventadas: todos los datos vienen de TVmaze.
- [ ] Sin placeholders externos (picsum/unsplash): póster real o placeholder con inicial.
- [ ] Microcopy real en español, con voz.
- [ ] Fuentes autohospedadas (offline-first): nada de `<link>` a Google Fonts en runtime.

## 10. Referencias

- **Referencias del owner (fuente de esta identidad):** [`docs/design/referencias/muestra-1.webp`](./referencias/muestra-1.webp)
  (mockup «BD Stream»: fondo negro/carbón, acento azul vivo en nav/CTA/enlaces, tarjetas redondeadas, badges de
  rating con estrella, corazón circular sobre póster, chips/pills, títulos blancos bold) y
  [`docs/design/referencias/muestra-2.webp`](./referencias/muestra-2.webp) (misma UI + Style Guide: *Text: Poppins
  y Lato; Color: azul, rosa/magenta, negro, blanco*).
- Poppins — Indian Type Foundry (geométrica, monolinear). Lato — Łukasz Dziedzic (humanista). Ambas vía Google Fonts (OFL), autohospedadas.
- W3C. (2024). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
- Material Design 3 — color roles (validación del oráculo `google-design`, variante BRAND) · Apple HIG — Touch targets 44 pt.
