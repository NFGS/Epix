import { Buffer } from 'node:buffer';

import type { BrowserContext, Route } from '@playwright/test';

import {
  episodesByShowFixture,
  scheduleFixture,
  searchGirlsResultsFixture,
  showDetailFixture,
  showWithNextEpisodeFixture,
} from './tvmaze-data';

/** Retardo artificial para observar skeletons sin volver lento el suite. */
const RESPONSE_DELAY_MS = 150;

/** PNG transparente de 1×1 para sustituir cualquier imagen de TVmaze. */
const PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const SHOW_PATH = /^\/shows\/(\d+)$/;
const EPISODES_PATH = /^\/shows\/(\d+)\/episodes$/;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function fulfillNotFound(route: Route): Promise<void> {
  await route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Not found' }),
  });
}

async function handleApiRequest(route: Route): Promise<void> {
  const url = new URL(route.request().url());
  await delay(RESPONSE_DELAY_MS);

  if (url.pathname === '/search/shows') {
    const query = url.searchParams.get('q')?.toLowerCase() ?? '';
    await fulfillJson(route, query === 'girls' ? searchGirlsResultsFixture : []);
    return;
  }

  const episodesMatch = EPISODES_PATH.exec(url.pathname);
  if (episodesMatch !== null) {
    const episodes = episodesByShowFixture[Number(episodesMatch[1])];
    if (episodes === undefined) {
      await fulfillNotFound(route);
      return;
    }

    await fulfillJson(route, episodes);
    return;
  }

  const showMatch = SHOW_PATH.exec(url.pathname);
  if (showMatch !== null) {
    const showId = Number(showMatch[1]);
    const detail =
      url.searchParams.get('embed') === 'nextepisode'
        ? showWithNextEpisodeFixture(showId)
        : showDetailFixture(showId);

    if (detail === null) {
      await fulfillNotFound(route);
      return;
    }

    await fulfillJson(route, detail);
    return;
  }

  if (url.pathname === '/schedule' || url.pathname === '/api/schedule') {
    await fulfillJson(route, scheduleFixture);
    return;
  }

  await fulfillNotFound(route);
}

/**
 * Mock determinista de TVmaze registrado a nivel de **BrowserContext**.
 *
 * Se usa `context.route` y no `page.route` porque el service worker de la PWA
 * re-emite las peticiones de la API: Playwright solo enruta las peticiones
 * originadas por el service worker desde el contexto, no desde la página.
 */
export async function mockTvmazeApi(context: BrowserContext): Promise<void> {
  await context.route('https://api.tvmaze.com/**', handleApiRequest);
  // La agenda se pide al proxy de mismo origen (`/api/schedule`), servido en
  // producción por la función de Vercel.
  await context.route('**/api/schedule**', handleApiRequest);
  await context.route('https://static.tvmaze.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(PIXEL_PNG_BASE64, 'base64'),
    });
  });
}
