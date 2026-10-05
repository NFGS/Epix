import { describe, expect, it, vi } from 'vitest';

import {
  createNotificationClient,
  NotificationError,
  NOTIFICATION_BADGE,
  NOTIFICATION_ICON,
  type NotificationApiLike,
  type NotificationConstructorLike,
  type ServiceWorkerRegistrationLike,
} from './notifications';

function apiWith(
  permission: NotificationPermission,
  requestPermission = vi.fn(async () => permission),
): NotificationApiLike {
  return { permission, requestPermission };
}

function createFakeNotificationCtor() {
  const created: Array<{ title: string; options?: NotificationOptions }> = [];

  class FakeNotification {
    static readonly permission: NotificationPermission = 'granted';
    static requestPermission = vi.fn(async () => 'granted' as NotificationPermission);

    constructor(title: string, options?: NotificationOptions) {
      created.push({ title, options });
    }

    close(): void {
      // Sin efecto en pruebas.
    }
  }

  return { created, ctor: FakeNotification as unknown as NotificationConstructorLike };
}

describe('createNotificationClient', () => {
  it('reporta «unsupported» cuando no existe la Notification API', async () => {
    const client = createNotificationClient({ api: null, getRegistration: null });

    expect(client.getPermissionState()).toBe('unsupported');
    await expect(client.requestPermission()).resolves.toBe('unsupported');
  });

  it.each<NotificationPermission>(['granted', 'denied', 'default'])(
    'mapea el permiso %s del navegador',
    (permission) => {
      const client = createNotificationClient({ api: apiWith(permission) });

      expect(client.getPermissionState()).toBe(permission);
    },
  );

  it('no vuelve a preguntar si el permiso ya fue concedido', async () => {
    const requestPermission = vi.fn(async () => 'denied' as NotificationPermission);
    const client = createNotificationClient({ api: apiWith('granted', requestPermission) });

    await expect(client.requestPermission()).resolves.toBe('granted');
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('devuelve «denied» si la solicitud de permiso falla', async () => {
    const failing = vi.fn(async () => {
      throw new Error('bloqueado');
    });
    const client = createNotificationClient({
      api: { permission: 'default', requestPermission: failing },
    });

    await expect(client.requestPermission()).resolves.toBe('denied');
  });

  it('muestra la notificación con el service worker, iconos PWA y data.url', async () => {
    const showNotification = vi.fn(async () => undefined);
    const registration: ServiceWorkerRegistrationLike = { showNotification };
    const client = createNotificationClient({
      api: apiWith('granted'),
      getRegistration: async () => registration,
      NotificationCtor: null,
    });

    await client.showLocalNotification({
      title: 'Nuevo episodio hoy',
      body: 'Girls — S1E02',
      url: '/shows/7',
      tag: 'ep-7-5',
    });

    expect(showNotification).toHaveBeenCalledWith('Nuevo episodio hoy', {
      body: 'Girls — S1E02',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      data: { url: '/shows/7' },
      tag: 'ep-7-5',
    });
  });

  it('omite data.url cuando la notificación no navega a ninguna parte', async () => {
    const showNotification = vi.fn(async () => undefined);
    const client = createNotificationClient({
      api: apiWith('granted'),
      getRegistration: async () => ({ showNotification }),
      NotificationCtor: null,
    });

    await client.showLocalNotification({ title: 'Sin enlace', body: 'Solo texto' });

    expect(showNotification).toHaveBeenCalledWith('Sin enlace', {
      body: 'Solo texto',
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_BADGE,
      data: undefined,
    });
  });

  it('usa el constructor Notification en escritorio cuando no hay service worker', async () => {
    const { created, ctor } = createFakeNotificationCtor();
    const client = createNotificationClient({
      api: apiWith('granted'),
      getRegistration: null,
      NotificationCtor: ctor,
    });

    await client.showLocalNotification({ title: 'Prueba', body: 'Cuerpo', url: '/favorites' });

    expect(created).toHaveLength(1);
    expect(created[0]).toEqual({
      title: 'Prueba',
      options: {
        body: 'Cuerpo',
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        data: { url: '/favorites' },
      },
    });
  });

  it('cae al constructor si el service worker rechaza la notificación', async () => {
    const showNotification = vi.fn(async () => {
      throw new Error('el SW no está activo');
    });
    const { created, ctor } = createFakeNotificationCtor();
    const client = createNotificationClient({
      api: apiWith('granted'),
      getRegistration: async () => ({ showNotification }),
      NotificationCtor: ctor,
    });

    await client.showLocalNotification({ title: 'Respaldo', body: 'Cuerpo' });

    expect(created).toHaveLength(1);
  });

  it('lanza NotificationError tipado si no hay service worker ni constructor', async () => {
    const client = createNotificationClient({
      api: null,
      getRegistration: null,
      NotificationCtor: null,
    });

    await expect(
      client.showLocalNotification({ title: 'Nada', body: 'Sin soporte' }),
    ).rejects.toBeInstanceOf(NotificationError);
  });
});
