import { useI18n } from '@/shared/i18n/i18n-context';

export function Spinner() {
  const { t } = useI18n();

  return (
    <span
      role="status"
      aria-label={t.common.loading}
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent"
    />
  );
}
