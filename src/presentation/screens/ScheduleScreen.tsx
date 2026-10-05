import { EmptyState } from '@/presentation/components/EmptyState';
import { CalendarIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function ScheduleScreen() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.screens.schedule.title}</h1>

      <EmptyState
        icon={<CalendarIcon className="h-6 w-6" />}
        title={t.screens.schedule.emptyTitle}
        description={t.screens.schedule.emptyDescription}
      />
    </div>
  );
}
