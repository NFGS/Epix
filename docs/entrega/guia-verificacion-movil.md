# Guía — Evidencias en Android físico

> Objetivo: capturar las evidencias que solo existen en un dispositivo real: **instalación de la
> PWA**, **notificación** y **GPS**. Duración estimada: 15–20 minutos.

## Requisito previo: servir la app con HTTPS (o vía adb)

Las PWA requieren *contexto seguro* para registrar el service worker. La IP de tu LAN por HTTP
**no** sirve. Dos opciones:

### Opción A — Desplegar (recomendada, también vale como demo)
Despliega `dist/` en Vercel/Netlify (build: `pnpm build`, carpeta `dist`). Obtienes una URL HTTPS
del tipo `https://epix-xxxx.vercel.app` y la abres en Chrome Android.

### Opción B — Cable USB + `adb reverse` (sin desplegar)
1. Activa **Opciones de desarrollador → Depuración USB** en el teléfono y conéctalo por USB.
2. En el PC:
   ```bash
   adb reverse tcp:4173 tcp:4173
   pnpm build && pnpm preview --port 4173 --strictPort
   ```
3. En Chrome Android abre `http://localhost:4173` (para el teléfono, `localhost` es contexto seguro).

## 1) Instalar la PWA

1. Abre la app en Chrome Android → menú `⋮` → **Añadir a pantalla de inicio / Instalar aplicación**.
2. Ábrela desde el icono: debe verse **sin barra del navegador** (modo standalone).
3. 📸 Captura sugerida: `android-01-instalada.png` (pantalla de inicio de la app instalada).

## 2) Notificaciones

1. En la app: **Perfil → Notificaciones** → activar (acepta el permiso del sistema).
2. Pulsa **«Enviar notificación de prueba»**.
3. 📸 Captura sugerida: `android-02-notificacion.png` (notificación visible en la barra/sombra).
4. Toca la notificación → debe abrir el detalle de la serie (**deep link**).
   📸 Captura sugerida: `android-03-deeplink.png`.

## 3) GPS

1. En **Agenda**, pulsa **«Usar mi ubicación»** y concede el permiso.
2. Debe aparecer el chip «Según tu ubicación · CO» y cargar la programación del país.
   📸 Captura sugerida: `android-04-gps-agenda.png` (chip + agenda).

## 4) Historial y «Mi actividad»

1. Navega, busca y abre un par de series; marca un favorito.
2. **Perfil → Mi actividad**: eventos con fecha/hora.
   📸 Captura sugerida: `android-05-mi-actividad.png`.

## 5) Guardar las evidencias

```bash
mkdir -p docs/evidencias/capturas-android
# copia aquí las capturas del teléfono (Android: carpeta DCIM/Screenshots)
```

Luego actualiza la tabla de `docs/evidencias/README.md` con las nuevas filas y haz commit.

## Checklist

- [ ] App instalada en standalone (`android-01`)
- [ ] Notificación de prueba recibida (`android-02`)
- [ ] Deep link desde la notificación (`android-03`)
- [ ] GPS → país en Agenda (`android-04`)
- [ ] Mi actividad con eventos (`android-05`)
- [ ] Capturas copiadas a `docs/evidencias/capturas-android/` y documentadas
