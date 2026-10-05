import { useOnlineStatus } from '@/presentation/hooks/queries/use-online-status';
import { useI18n } from '@/shared/i18n/i18n-context';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (isOnline) {
    return null;
  }

  return (
    <p
      role="status"
      className="border-b border-border bg-warning/12 px-4 py-1.5 text-center text-xs font-semibold text-warning"
    >
      {t.common.offline}
    </p>
  );
}
