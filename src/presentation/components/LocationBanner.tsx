import type { LocationRequestStatus } from '@/presentation/hooks/use-request-location';
import { formatTemplate } from '@/shared/lib/format';
import { useI18n } from '@/shared/i18n/i18n-context';

import { LocationIcon } from './icons';
import { Spinner } from './Spinner';

interface LocationBannerProps {
  status: LocationRequestStatus;
  message: string | null;
  onRequest: () => void;
}

/** CTA de GPS en Agenda: visible solo mientras el país no provenga del GPS. */
export function LocationBanner({ status, message, onRequest }: LocationBannerProps) {
  const { t } = useI18n();
  const isRequesting = status === 'requesting';

  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <LocationIcon className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t.location.bannerTitle}</p>
          <p className="text-sm leading-relaxed text-muted">{t.location.bannerDescription}</p>
        </div>
      </div>

      {status === 'error' && message !== null && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger"
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={onRequest}
        disabled={isRequesting}
        aria-busy={isRequesting}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRequesting ? <Spinner /> : <LocationIcon className="h-4 w-4" />}
        {isRequesting ? t.location.detecting : t.location.useButton}
      </button>
    </section>
  );
}

interface GpsCountryChipProps {
  country: string;
  onChooseManually: () => void;
}

/** Confirmación de país detectado por GPS con salida a la selección manual. */
export function GpsCountryChip({ country, onChooseManually }: GpsCountryChipProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
      <p className="inline-flex items-center gap-2 text-sm text-muted">
        <LocationIcon className="h-4 w-4 text-accent-text" />
        {formatTemplate(t.location.gpsChip, { country })}
      </p>
      <button
        type="button"
        onClick={onChooseManually}
        className="min-h-11 rounded-full bg-surface-2 px-4 text-xs font-bold uppercase tracking-[1.4px] text-muted transition-colors duration-150 hover:text-fg"
      >
        {t.location.chooseManually}
      </button>
    </div>
  );
}
