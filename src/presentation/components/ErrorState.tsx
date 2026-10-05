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
      className="flex flex-col items-center gap-2 px-6 py-10 text-center"
    >
      <span className="mb-1 text-danger">
        <AlertIcon className="h-7 w-7" />
      </span>
      <h2 className="text-base font-bold">{t.common.errorTitle}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{message}</p>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-11 rounded-full bg-accent px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          {t.common.retry}
        </button>
      )}
    </section>
  );
}
