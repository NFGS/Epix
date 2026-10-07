import type { FavoritesRepository } from '@/domain/ports/favorites-repository';
import type { HistoryRepository } from '@/domain/ports/history-repository';
import type { OutboxRepository } from '@/domain/ports/outbox-repository';
import type { SyncMetaRepository } from '@/domain/ports/sync-meta-repository';
import type { UsageEventsRepository } from '@/domain/ports/usage-events-repository';

export interface ClearUserDataDeps {
  favorites: Pick<FavoritesRepository, 'clear'>;
  history: Pick<HistoryRepository, 'clear'>;
  usageEvents: Pick<UsageEventsRepository, 'clear'>;
  outbox: Pick<OutboxRepository, 'purgeByEntity'>;
  syncMeta: Pick<SyncMetaRepository, 'clear'>;
}

/**
 * Borra los datos locales del usuario al cerrar sesión en un dispositivo
 * compartido: favoritos, historial (incluidas búsquedas recientes), actividad,
 * cola de sincronización y cursores. **Conserva las preferencias de UI**
 * (tema, idioma, filtros), que son del dispositivo y no del usuario.
 *
 * La nube no se toca: al volver a iniciar sesión, el pull completo restaura
 * los datos de la cuenta.
 */
export async function clearUserData(deps: ClearUserDataDeps): Promise<void> {
  await deps.favorites.clear();
  await deps.history.clear();
  await deps.usageEvents.clear();
  await deps.syncMeta.clear();
  await deps.outbox.purgeByEntity('favorite');
  await deps.outbox.purgeByEntity('history');
  await deps.outbox.purgeByEntity('telemetry');
}
