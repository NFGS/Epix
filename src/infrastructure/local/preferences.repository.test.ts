import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_PREFERENCES } from '@/domain/entities/preferences';

import { createEpixDatabase, type EpixDatabase } from './db';
import { createPreferencesRepository, LEGACY_COUNTRY_STORAGE_KEY } from './preferences.repository';

const T1 = '2026-10-05T10:00:00.000Z';
const T2 = '2026-10-05T11:00:00.000Z';

describe('PreferencesRepository (Dexie)', () => {
  let db: EpixDatabase;

  beforeEach(() => {
    db = createEpixDatabase(`epix-test-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('get() devuelve los defaults en memoria sin escribir (seguro en liveQuery)', async () => {
    const repository = createPreferencesRepository(db, { now: () => T1, storage: null });

    const preferences = await repository.get();

    expect(preferences).toEqual({ ...DEFAULT_PREFERENCES, updatedAt: T1 });
    expect(await db.preferences.get('app')).toBeUndefined();
  });

  it('ensureSeeded() persiste la fila por defecto una sola vez', async () => {
    const repository = createPreferencesRepository(db, { now: () => T1, storage: null });

    await repository.ensureSeeded();
    await repository.ensureSeeded();

    expect(await db.preferences.count()).toBe(1);
    expect(await db.preferences.get('app')).toMatchObject({
      key: 'app',
      favoriteGenres: [],
      maxAgeRating: 'TV-14',
      syncStatus: 'pending',
    });
  });

  it('hace merge de los cambios parciales y sella updatedAt', async () => {
    let now = T1;
    const repository = createPreferencesRepository(db, { now: () => now, storage: null });

    now = T2;
    await repository.update({ favoriteGenres: ['Drama'] });
    const updated = await repository.update({ maxAgeRating: 'TV-PG' });

    expect(updated.favoriteGenres).toEqual(['Drama']);
    expect(updated.maxAgeRating).toBe('TV-PG');
    expect(updated.country).toBeNull();
    expect(updated.updatedAt).toBe(T2);
    expect(await repository.get()).toEqual(updated);
  });

  it('serializa actualizaciones concurrentes sin perder cambios', async () => {
    const repository = createPreferencesRepository(db, { now: () => T1, storage: null });

    await Promise.all([
      repository.update({ favoriteGenres: ['Drama'] }),
      repository.update({ maxAgeRating: 'TV-PG' }),
    ]);

    const preferences = await repository.get();
    expect(preferences.favoriteGenres).toEqual(['Drama']);
    expect(preferences.maxAgeRating).toBe('TV-PG');
  });

  it('migra una sola vez el país heredado de localStorage', async () => {
    window.localStorage.setItem(LEGACY_COUNTRY_STORAGE_KEY, 'CO');
    const repository = createPreferencesRepository(db, { now: () => T1 });

    const preferences = await repository.ensureSeeded();

    expect(preferences.country).toBe('CO');
    expect(preferences.countrySource).toBe('manual');
  });

  it('ignora valores inválidos del almacén heredado', async () => {
    window.localStorage.setItem(LEGACY_COUNTRY_STORAGE_KEY, 'XX');
    const repository = createPreferencesRepository(db, { now: () => T1 });

    const preferences = await repository.get();

    expect(preferences.country).toBeNull();
    expect(preferences.countrySource).toBeNull();
  });

  it('no re-migra cuando ya existe una fila local', async () => {
    window.localStorage.setItem(LEGACY_COUNTRY_STORAGE_KEY, 'CO');
    const repository = createPreferencesRepository(db, { now: () => T1 });
    await repository.ensureSeeded();

    await repository.update({ country: 'MX', countrySource: 'manual' });

    expect((await repository.get()).country).toBe('MX');
  });
});
