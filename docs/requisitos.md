# Requisitos — Epix

Especificación de Requisitos Funcionales (RF) y No Funcionales (RNF) del proyecto **Epix**,
trazados con los requisitos obligatorios del instructor (REQ-01…REQ-09, ver `SPEC.md` §4).

- **Metodología de especificación:** historias de usuario INVEST y criterios de aceptación en Gherkin
  para los flujos críticos; priorización MoSCoW.
- **Convención de IDs:** `RF-XX` / `RNF-XX`. Prioridad: **M** (Must), **S** (Should), **C** (Could).

---

## 1. Requisitos Funcionales

### RF-01 — Búsqueda de series (M) · REQ-01 · Incremento 2

El usuario puede buscar series por nombre y ver resultados con imagen, año y géneros.

**CA-01.1**
```gherkin
Dado que el usuario está en la pantalla Buscar
Cuando escribe "girls" con 3 o más caracteres
Entonces el sistema consulta GET /search/shows?q=girls
Y muestra tarjetas con imagen, nombre, año y géneros
Y responde en menos de 2 segundos con conexión normal
```

**CA-01.2**
```gherkin
Dada una búsqueda sin resultados
Entonces se muestra un estado vacío ilustrado con sugerencias
```

### RF-02 — Detalle de serie (M) · REQ-01 · Incremento 2

El usuario ve información completa: sinopsis, elenco, episodios y temporadas.

**CA-02.1**
```gherkin
Dado un resultado de búsqueda
Cuando el usuario abre la serie
Entonces se consulta GET /shows/:id?embed[]=episodes&embed[]=cast
Y se muestran sinopsis, elenco y lista de episodios por temporada
```

### RF-03 — Agenda de programación (M) · REQ-01, REQ-03 · Incrementos 2 y 5

El usuario consulta los episodios que se emiten hoy según país y fecha,
con el país detectado por GPS (RF-09) o elegido manualmente.

**CA-03.1**
```gherkin
Dado un país seleccionado (por GPS o manual) y la fecha actual
Cuando el usuario abre la pestaña Agenda
Entonces el sistema consulta GET /schedule?country=XX&date=YYYY-MM-DD
Y agrupa los episodios por hora de emisión con su serie y canal
```

### RF-04 — Personalización de interfaz (M) · REQ-02 · Incremento 4

Preferencias visuales: tema (claro/oscuro/sistema), idioma (es/en) y tamaño de texto.

**CA-04.1**
```gherkin
Dado que el usuario cambia el tema a oscuro en Perfil
Entonces toda la interfaz cambia inmediatamente
Y la preferencia queda guardada para la próxima sesión
```

### RF-05 — Personalización de contenido (M) · REQ-02 · Incremento 4

Preferencias de contenido: géneros favoritos y rango de edad permitido
(clasificaciones TV: TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA).

**CA-05.1**
```gherkin
Dado que el usuario configura "TV-PG" como edad máxima y los géneros Drama y Ciencia ficción
Cuando navega por Inicio y Agenda
Entonces solo se muestran series que cumplen ambos filtros
Y se indica visualmente cuando un filtro oculta resultados
```

### RF-06 — Persistencia y edición de preferencias (M) · REQ-02 · Incrementos 3 y 4

Todas las preferencias se guardan localmente y el usuario puede verlas y modificarlas en cualquier momento.

**CA-06.1**
```gherkin
Dado un usuario que guardó sus preferencias
Cuando cierra y vuelve a abrir la aplicación
Entonces sus preferencias siguen aplicadas
Y puede restablecerlas a los valores por defecto desde Perfil
```

### RF-07 — Favoritos (M) · REQ-07 · Incremento 3

Agregar/quitar series de favoritos, disponibles offline y sincronizadas.

**CA-07.1**
```gherkin
Dado el detalle de una serie
Cuando el usuario toca el botón de favorito
Entonces la serie se agrega a la lista local (IndexedDB) de inmediato
Y se encola la operación para sincronizar con la nube
Y aunque no haya conexión, el favorito permanece tras reiniciar la app
```

### RF-08 — Historial (M) · REQ-07, REQ-05 · Incremento 3

Historial de series vistas y búsquedas recientes, con opción de limpiar.

**CA-08.1**
```gherkin
Dado que el usuario abrió 3 series y realizó 2 búsquedas
Cuando entra a la pestaña Historial
Entonces ve los registros ordenados por fecha descendente con fecha y hora
Y puede vaciar el historial con confirmación previa
```

### RF-09 — GPS → país (M) · REQ-03 · Incremento 5

Con consentimiento explícito, el sistema usa la geolocalización para detectar el país
y personalizar la agenda; siempre existe alternativa manual.

**CA-09.1**
```gherkin
Dado que el usuario concede el permiso de ubicación
Cuando se detecta su posición
Entonces se resuelve el país por geocodificación inversa
Y la Agenda carga la programación de ese país
Y el evento queda registrado en telemetría (solo si el usuario aceptó telemetría)
```

**CA-09.2**
```gherkin
Dado que el usuario niega el permiso de ubicación
Entonces la app sigue funcionando con el país configurado manualmente
Y nunca se vuelve a solicitar el permiso automáticamente
```

### RF-10 — Notificaciones locales (M) · REQ-04 · Incremento 6

Recordatorios de nuevos episodios de series favoritas mediante notificaciones locales.

**CA-10.1**
```gherkin
Dado que el usuario activó las notificaciones
Cuando hay un episodio hoy de una serie de sus favoritos
Entonces recibe una notificación con el nombre de la serie y la hora
Al tocarla, se abre el detalle de la serie (deep link /shows/:id)
```

**CA-10.2**
```gherkin
Dado que el usuario desactiva las notificaciones en Perfil
Entonces no se vuelve a mostrar ninguna notificación de la app
```

### RF-11 — Telemetría de uso (M) · REQ-05 · Incremento 7

Registro en base de datos externa de: fecha/hora de uso, opciones usadas y términos buscados.

**CA-11.1**
```gherkin
Dado que el usuario aceptó la telemetría en el onboarding
Cuando usa la app (abre sesión, busca, marca favorito, cambia preferencias)
Entonces cada evento se guarda localmente con fecha/hora y zona horaria
Y se sincroniza por lotes a Supabase cuando hay conexión
Y el usuario puede ver y borrar sus datos desde "Mi actividad"
```

**CA-11.2**
```gherkin
Dado que el usuario rechazó la telemetría
Entonces no se registra ningún evento de uso (solo datos funcionales locales)
```

### RF-12 — Caché y modo offline (M) · REQ-06 · Incrementos 2 y 3

La app debe abrir y funcionar sin conexión con los datos ya visitados.

**CA-12.1**
```gherkin
Dado que el usuario usó la app con conexión
Cuando queda sin conexión y vuelve a abrirla
Entonces el app shell carga desde la caché del service worker
Y puede ver favoritos, historial y las últimas series consultadas
Y se muestra un aviso sutil de "sin conexión"
```

### RF-13 — Sincronización local ↔ nube (M) · REQ-06 · Incrementos 3 y 8

Sincronización bidireccional básica con resolución de conflictos y reintentos.

**CA-13.1**
```gherkin
Dado que el usuario realizó cambios sin conexión (favoritos)
Cuando vuelve la conexión (evento online o al abrir la app)
Entonces las operaciones en cola se envían en orden con reintentos y backoff
Y los cambios remotos más recientes se reflejan localmente (last-write-wins)
Y no se generan duplicados (upsert idempotente con id de cliente)
```

### RF-14 — PWA instalable (M) · REQ-08 · Incrementos 1 y 2

Instalación en pantalla de inicio con manifest, iconos y modo standalone.

**CA-14.1**
```gherkin
Dado un dispositivo compatible con navegador Chromium o Safari iOS
Cuando el usuario visita Epix
Entonces el navegador ofrece instalarla (o indica "Agregar a pantalla de inicio")
Y al abrirla se ejecuta en modo standalone con su icono y nombre
```

### RF-15 — Navegación y estados de interfaz (M) · UX · Incremento 1

Navegación inferior de 5 destinos y estados de carga/error/vacío consistentes.

**CA-15.1**
```gherkin
Dado cualquier pantalla con carga de datos
Cuando los datos están en camino
Entonces se muestra una pantalla esquelética (skeleton) acorde al contenido
Y ante error se ofrece reintentar sin recargar la página
```

---

## 2. Requisitos No Funcionales

| ID | Categoría | Requisito | Métrica / verificación |
| --- | --- | --- | --- |
| RNF-01 | Rendimiento | Carga rápida y fluida | LCP < 2.5 s en 4G; bundle inicial < 250 KB gzip; Lighthouse perf ≥ 90 |
| RNF-02 | Seguridad | Sin secretos en el repo; RLS estricto; solo anon key | Revisión `levi` + escaneo de secretos en CI |
| RNF-03 | Privacidad | Telemetría opt-in, datos mínimos, derecho a borrado | Pantalla "Mi actividad" con borrado total |
| RNF-04 | Disponibilidad | Operación offline de funciones núcleo | Prueba E2E en modo offline (Playwright) |
| RNF-05 | Accesibilidad | WCAG 2.2 AA; touch targets ≥ 44 px; contraste AA | Auditoría Lighthouse + checklist manual |
| RNF-06 | Compatibilidad | Chrome/Edge Android; Safari iOS ≥ 16.4; desktop | Matriz de pruebas E2E en 3 viewports |
| RNF-07 | Mantenibilidad | Capas limpias; TS estricto; pruebas | Cobertura ≥ 70 % en `domain/` y `application/` |
| RNF-08 | Escalabilidad | Nuevas fuentes de datos sin reescribir UI | Puertos/repositorios intercambiables (patrón adaptador) |
| RNF-09 | Observabilidad | Trazabilidad de sync y errores | Logs de outbox con timestamp; panel de estado |
| RNF-10 | Internacionalización | UI en español e inglés | Todos los textos desde catálogo i18n |

---

## 3. Matriz de trazabilidad (macro)

| REQ instructor | RF asociados | RNF asociados | Incremento | Prueba | Evidencia |
| --- | --- | --- | --- | --- | --- |
| REQ-01 API TVmaze | RF-01, RF-02, RF-03 | RNF-01 | 2 | Unit (cliente+Zod) + E2E búsqueda | Capturas + Postman + red DevTools |
| REQ-02 Personalización | RF-04, RF-05, RF-06 | RNF-05, RNF-10 | 4 | Unit (store prefs) + E2E | Capturas + tabla `preferences` |
| REQ-03 GPS | RF-09 (y RF-03) | RNF-03 | 5 | E2E con geolocalización simulada | Captura permiso + agenda país |
| REQ-04 Notificaciones | RF-10 | RNF-06 | 6 | E2E (Notification API) | Captura notificación Android |
| REQ-05 Telemetría | RF-11 (y RF-08) | RNF-03, RNF-09 | 7 | Unit (eventos) + verificación BD | Filas en `usage_events` + "Mi actividad" |
| REQ-06 Caché/sync | RF-12, RF-13 | RNF-04 | 3 | E2E offline + unit outbox | Video offline + logs sync |
| REQ-07 Favoritos/historial | RF-07, RF-08 | RNF-04 | 3 | Unit + E2E | Capturas + sync en Supabase |
| REQ-08 PWA instalable | RF-14 | RNF-01, RNF-06 | 1–2 | Lighthouse + instalación | Informe Lighthouse + captura |
| REQ-09 Documentación | — | — | 1 | Revisión docente | Notion público + correo |

---

## 4. Reglas de negocio

- **RN-01**: las operaciones de escritura offline nunca se pierden: primero local (IndexedDB), luego nube.
- **RN-02**: el dominio no conoce frameworks; las dependencias apuntan hacia adentro (Clean Architecture).
- **RN-03**: TVmaze se consume sin API key; toda salida se valida con Zod antes de entrar al dominio.
- **RN-04**: la telemetría jamás incluye datos personales sensibles; la ubicación solo se registra con consentimiento.
- **RN-05**: la atribución a TVmaze (CC BY-SA) es visible en la app.
