import { useState } from 'react';

import { EmptyState } from '@/presentation/components/EmptyState';
import { SearchInput } from '@/presentation/components/SearchInput';
import { SearchIcon } from '@/presentation/components/icons';
import { useI18n } from '@/shared/i18n/i18n-context';

export function SearchScreen() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.screens.search.title}</h1>

      <SearchInput
        value={query}
        onChange={setQuery}
        label={t.screens.search.inputLabel}
        placeholder={t.screens.search.placeholder}
        clearLabel={t.common.clear}
      />

      <EmptyState
        icon={<SearchIcon className="h-6 w-6" />}
        title={t.screens.search.emptyTitle}
        description={t.screens.search.emptyDescription}
      />
    </div>
  );
}
