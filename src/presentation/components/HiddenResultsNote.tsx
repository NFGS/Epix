import { Link } from 'react-router-dom';

import { formatTemplate } from '@/shared/lib/format';
import { useI18n } from '@/shared/i18n/i18n-context';

/**
 * Nota sutil cuando las preferencias de contenido ocultan resultados (RF-05).
 * Enlaza a Perfil para que el usuario pueda ajustar los filtros.
 */
export function HiddenResultsNote({ hiddenCount }: { hiddenCount: number }) {
  const { t } = useI18n();

  if (hiddenCount === 0) {
    return null;
  }

  const label = formatTemplate(hiddenCount === 1 ? t.filters.hiddenOne : t.filters.hiddenMany, {
    count: hiddenCount,
  });

  return (
    <p className="text-xs text-muted">
      {label} ·{' '}
      <Link
        to="/profile"
        className="font-semibold text-accent-text underline-offset-2 hover:underline"
      >
        {t.filters.adjust}
      </Link>
    </p>
  );
}
