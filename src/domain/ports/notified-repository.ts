/**
 * Puerto de recordatorios ya enviados (Dexie v2, tabla `notified`).
 *
 * Evita repetir la misma notificación para una combinación serie/episodio,
 * incluso entre sesiones o dispositivos que comparten el mismo perfil local.
 */

export interface NotifiedEpisode {
  /** Clave `<showId>:<episodeId>`. */
  key: string;
  showId: number;
  episodeId: number;
  notifiedAt: string;
}

export interface NotifiedRepository {
  isNotified(key: string): Promise<boolean>;
  markNotified(record: NotifiedEpisode): Promise<void>;
}
