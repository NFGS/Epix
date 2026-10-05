import { test as base, expect } from '@playwright/test';

import { mockTvmazeApi } from './tvmaze-mock';

/**
 * `test` de Epix: cada test corre con la API de TVmaze mockeada (fixtures
 * deterministas, sin red real), imágenes incluidas.
 */
export const test = base.extend<{ mockTvmazeApi: undefined }>({
  mockTvmazeApi: [
    async ({ context }, use) => {
      await mockTvmazeApi(context);
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect };
