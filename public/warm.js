/*
 * Pre-calentado de la agenda de Inicio (best-effort).
 *
 * Dispara la petición a TVmaze lo antes posible para que la respuesta quede en
 * la caché HTTP del navegador (TVmaze envía `cache-control: public, max-age=3600`).
 * Cuando React Query hace la misma petición, se sirve desde esa caché y el
 * contenido de Inicio pinta antes (mejora LCP en la primera visita).
 *
 * Reglas: solo en la ruta Inicio, nunca con «ahorro de datos» activo y cualquier
 * error se ignora en silencio (es un extra, no un requisito de la app).
 */
(() => {
  try {
    if (location.pathname !== '/') {
      return;
    }
    const connection = navigator.connection;
    if (connection && connection.saveData) {
      return;
    }
    const match = /-([A-Za-z]{2})\b/.exec(navigator.language || '');
    const country = (match ? match[1] : 'us').toUpperCase();
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    void fetch(`https://api.tvmaze.com/schedule?country=${country}&date=${date}`, {
      mode: 'cors',
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    /* best-effort: nunca interrumpe la carga */
  }
})();
