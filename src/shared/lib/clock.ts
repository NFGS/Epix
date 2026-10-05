/** Reloj y generador de identificadores en un único punto inyectable. */
export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(): string {
  return crypto.randomUUID();
}

export function currentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
