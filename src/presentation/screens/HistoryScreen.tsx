import { EmptyState } from '@/presentation/components/EmptyState';
import { ClockIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function HistoryScreen() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.02em]">
        {t.screens.history.title}
      </h1>

      <EmptyState
        icon={<ClockIcon className="h-7 w-7" />}
        title={t.screens.history.emptyTitle}
        description={t.screens.history.emptyDescription}
      />
    </div>
  );
}
