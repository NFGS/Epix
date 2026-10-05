/**
 * Puerto de notificaciones locales (RF-10).
 *
 * El dominio describe el contrato; la infraestructura lo implementa con la
 * Notification API y el service worker. La implementación es inyectable para
 * que los casos de uso y la UI se prueben sin tocar el navegador.
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface LocalNotificationOptions {
  title: string;
  body: string;
  /** Ruta interna que se abre al tocar la notificación (p. ej. `/shows/12`). */
  url?: string;
  /** Identificador para agrupar/reemplazar avisos del mismo episodio. */
  tag?: string;
}

export interface NotificationsPort {
  getPermissionState(): NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  showLocalNotification(options: LocalNotificationOptions): Promise<void>;
}
