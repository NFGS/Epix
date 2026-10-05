import { useI18n } from '@/shared/i18n/i18n-context';

import { AlertIcon } from './icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <section
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-6 py-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-400">
        <AlertIcon className="h-6 w-6" />
      </span>
      <h2 className="text-base font-semibold">{t.common.errorTitle}</h2>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {t.common.retry}
        </button>
      )}
    </section>
  );
}
