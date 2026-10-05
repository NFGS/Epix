import { describe, expect, it } from 'vitest';

import { todayIso } from './date';
import { groupEpisodesBySeason } from './episodes';
import { formatTemplate } from './format';
import { countryFromLocale, isScheduleCountryCode, SCHEDULE_COUNTRIES } from './locale';
import { groupByHour } from './schedule';
import type { Episode } from '@/domain/entities/show';
import type { ScheduleEntry } from '@/domain/entities/schedule-entry';

describe('todayIso', () => {
  it('formatea la fecha local como YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });
});

describe('countryFromLocale', () => {
  it('extrae la región del locale', () => {
    expect(countryFromLocale('es-CO')).toBe('CO');
    expect(countryFromLocale('en_us')).toBe('US');
  });

  it('usa US cuando no hay región o el locale es inválido', () => {
    expect(countryFromLocale('es')).toBe('US');
    expect(countryFromLocale('???')).toBe('US');
    expect(countryFromLocale(undefined)).toBe('US');
  });

  it('valida códigos contra el catálogo de la agenda', () => {
    expect(isScheduleCountryCode('CO')).toBe(true);
    expect(isScheduleCountryCode('XX')).toBe(false);
    expect(SCHEDULE_COUNTRIES).toHaveLength(10);
  });
});

describe('formatTemplate', () => {
  it('reemplaza marcadores y conserva los desconocidos', () => {
    expect(formatTemplate('{count} resultados para «{query}»', { count: 3, query: 'dark' })).toBe(
      '3 resultados para «dark»',
    );
    expect(formatTemplate('Hola {nombre}', {})).toBe('Hola {nombre}');
  });
});

describe('groupByHour', () => {
  const base: Omit<ScheduleEntry, 'episodeId' | 'airtime' | 'showName'> = {
    airdate: '2026-10-05',
    episodeName: 'Episodio',
    season: 1,
    number: 1,
    showId: 1,
  };

  it('agrupa por hora y deja las entradas sin hora al final', () => {
    const entries: ScheduleEntry[] = [
      { ...base, episodeId: 1, airtime: '21:00', showName: 'Zeta' },
      { ...base, episodeId: 2, airtime: '09:30', showName: 'Alfa' },
      { ...base, episodeId: 3, airtime: undefined, showName: 'Sin hora' },
    ];

    const groups = groupByHour(entries);

    expect(groups.map((group) => group.hour)).toEqual(['09:30', '21:00', null]);
    expect(groups[2].entries[0].episodeId).toBe(3);
  });

  it('ordena alfabéticamente las entradas de la misma hora', () => {
    const entries: ScheduleEntry[] = [
      { ...base, episodeId: 1, airtime: '20:00', showName: 'Zeta' },
      { ...base, episodeId: 2, airtime: '20:00', showName: 'Alfa' },
    ];

    const [group] = groupByHour(entries);

    expect(group.entries.map((entry) => entry.showName)).toEqual(['Alfa', 'Zeta']);
  });
});

describe('groupEpisodesBySeason', () => {
  const episode = (id: number, season: number, number: number): Episode => ({
    id,
    name: `Episodio ${id}`,
    season,
    number,
  });

  it('agrupa por temporada en orden y ordena por número', () => {
    const groups = groupEpisodesBySeason([
      episode(3, 2, 1),
      episode(1, 1, 2),
      episode(2, 1, 1),
      episode(4, 2, 2),
    ]);

    expect(groups.map((group) => group.season)).toEqual([1, 2]);
    expect(groups[0].episodes.map((entry) => entry.id)).toEqual([2, 1]);
    expect(groups[1].episodes.map((entry) => entry.id)).toEqual([3, 4]);
  });

  it('devuelve lista vacía sin episodios', () => {
    expect(groupEpisodesBySeason([])).toEqual([]);
  });
});
