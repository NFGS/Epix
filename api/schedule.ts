const TVMAZE_SCHEDULE_URL = 'https://api.tvmaze.com/schedule';
const USER_AGENT = 'Epix/1.0 (+https://epix-xi.vercel.app)';
const TIMEOUT_MS = 8_000;
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
const UPSTREAM_ERROR = 'No se pudo obtener la agenda';
const INVALID_PARAMS = 'Parámetros inválidos: usa country=XX y date=YYYY-MM-DD.';
const OUT_OF_WINDOW = 'Fecha fuera de la ventana permitida (±14 días).';

const COUNTRY_PATTERN = /^[A-Za-z]{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// E-06: la agenda solo se consume para fechas cercanas (Hoy/Ayer). Acotar la
// ventana colapsa el espacio de claves de caché en el CDN y evita reenviar a
// TVmaze fechas arbitrarias.
const DATE_WINDOW_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * E-07: `YYYY-MM-DD` de calendario real. El patrón por sí solo acepta
 * `2026-99-99`; el round-trip por `Date` en UTC rechaza meses/días inexistentes
 * (p. ej. `2026-02-30`, que JavaScript normalizaría a marzo).
 */
function isRealCalendarDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function utcDayNumber(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY;
}

/** `true` cuando la fecha está a ±`DATE_WINDOW_DAYS` días UTC de hoy. */
function isWithinDateWindow(date: string, now: Date): boolean {
  const requested = utcDayNumber(new Date(`${date}T00:00:00.000Z`));
  return Math.abs(requested - utcDayNumber(now)) <= DATE_WINDOW_DAYS;
}

/** Nombre del error sin asumir `instanceof Error` (DOMException de jsdom no hereda). */
function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === 'string' && name !== '') {
      return name;
    }
  }

  return 'UnknownError';
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const country = params.get('country');
  const date = params.get('date');

  if (
    country === null ||
    date === null ||
    !COUNTRY_PATTERN.test(country) ||
    !isRealCalendarDate(date)
  ) {
    return errorResponse(400, INVALID_PARAMS);
  }

  if (!isWithinDateWindow(date, new Date())) {
    return errorResponse(400, OUT_OF_WINDOW);
  }

  const upstreamUrl = new URL(TVMAZE_SCHEDULE_URL);
  upstreamUrl.searchParams.set('country', country.toUpperCase());
  upstreamUrl.searchParams.set('date', date);

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      // P-12: log estructurado sin parámetros sensibles (solo país, fecha y
      // código); el cliente recibe un mensaje genérico.
      console.error('api/schedule: TVmaze respondió con error.', {
        status: upstream.status,
        country,
        date,
      });
      return errorResponse(502, UPSTREAM_ERROR);
    }

    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': SUCCESS_CACHE_CONTROL,
      },
    });
  } catch (error) {
    const name = errorName(error);
    console.error(
      name === 'AbortError'
        ? 'api/schedule: TVmaze superó el tiempo máximo de respuesta.'
        : 'api/schedule: fallo consultando TVmaze.',
      { status: 0, country, date, name },
    );
    return errorResponse(502, UPSTREAM_ERROR);
  } finally {
    clearTimeout(timer);
  }
}
