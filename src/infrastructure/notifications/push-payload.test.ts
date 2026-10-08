import { describe, expect, it, vi } from 'vitest';

import { parsePushPayload, type PushMessageDataLike } from './push-payload';

function messageData(json: () => unknown, text: () => string): PushMessageDataLike {
  return { json, text };
}

describe('parsePushPayload (P-15)', () => {
  it('extrae title, body y url de un JSON válido con data anidada', () => {
    const data = messageData(
      () => ({ title: 'Nuevo episodio', body: 'Dark S1E02', data: { url: '/shows/7' } }),
      () => '',
    );

    expect(parsePushPayload(data)).toEqual({
      title: 'Nuevo episodio',
      body: 'Dark S1E02',
      url: '/shows/7',
    });
  });

  it('acepta el formato plano { title, body, url }', () => {
    const data = messageData(
      () => ({ title: 'Epix', body: 'Hola', url: '/favorites' }),
      () => '',
    );

    expect(parsePushPayload(data)).toEqual({
      title: 'Epix',
      body: 'Hola',
      url: '/favorites',
    });
  });

  it('usa texto plano como cuerpo', () => {
    const data = messageData(
      () => {
        throw new Error('no es JSON');
      },
      () => 'Aviso sin formato',
    );

    expect(parsePushPayload(data)).toEqual({ body: 'Aviso sin formato' });
  });

  it('devuelve vacío con payload malformado que no es JSON ni texto', () => {
    const data = messageData(
      () => {
        throw new Error('no es JSON');
      },
      () => {
        throw new Error('sin texto');
      },
    );

    expect(parsePushPayload(data)).toEqual({});
  });

  it.each([
    ['data nula', null],
    ['data ausente', undefined],
  ])('devuelve vacío con %s', (_case, data) => {
    expect(parsePushPayload(data)).toEqual({});
  });

  it('devuelve vacío con JSON que no es objeto', () => {
    expect(
      parsePushPayload(
        messageData(
          () => null,
          () => '',
        ),
      ),
    ).toEqual({});
    expect(
      parsePushPayload(
        messageData(
          () => 'solo texto',
          () => '',
        ),
      ),
    ).toEqual({});
  });

  it('devuelve vacío con texto en blanco', () => {
    const data = messageData(
      () => {
        throw new Error('no es JSON');
      },
      () => '   ',
    );

    expect(parsePushPayload(data)).toEqual({});
  });

  it('ignora campos que no son cadenas no vacías', () => {
    const data = messageData(
      () => ({ title: 42, body: '  ', data: { url: '' } }),
      () => '',
    );

    expect(parsePushPayload(data)).toEqual({});
  });
});

describe('parsePushPayload · tolerancia', () => {
  it('no propaga errores de json ni de text', () => {
    const data = messageData(
      vi.fn(() => {
        throw new Error('json roto');
      }),
      vi.fn(() => {
        throw new Error('text roto');
      }),
    );

    expect(() => parsePushPayload(data)).not.toThrow();
  });
});
