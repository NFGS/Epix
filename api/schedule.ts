const TVMAZE_SCHEDULE_URL = 'https://api.tvmaze.com/schedule';
const USER_AGENT = 'Epix/1.0 (+https://epix-xi.vercel.app)';
const TIMEOUT_MS = 8_000;
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
const UPSTREAM_ERROR = 'No se pudo obtener la agenda';

const COUNTRY_PATTERN = /^[A-Za-z]{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const country = params.get('country');
  const date = params.get('date');

  if (
    country === null ||
    date === null ||
    !COUNTRY_PATTERN.test(country) ||
    !DATE_PATTERN.test(date)
  ) {
    return errorResponse(400, 'Parámetros inválidos: usa country=XX y date=YYYY-MM-DD.');
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
  } catch {
    return errorResponse(502, UPSTREAM_ERROR);
  } finally {
    clearTimeout(timer);
  }
}
