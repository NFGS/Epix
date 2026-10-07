import { useRegisterSW } from 'virtual:pwa-register/react';

import { useI18n } from '@/shared/i18n/i18n-context';

import { CloseIcon } from './icons';

/**
 * Aviso de nueva versión (flujo prompt del service worker): registra el SW y,
 * cuando hay una versión esperando, ofrece actualizar o posponer el aviso.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center gap-2 rounded-full border border-border bg-surface-2 p-1.5 pl-4 shadow-dialog"
    >
      <p className="min-w-0 flex-1 text-xs font-medium leading-snug">{t.updatePrompt.message}</p>

      <button
        type="button"
        onClick={() => {
          void updateServiceWorker(true);
        }}
        className="min-h-11 shrink-0 rounded-full bg-accent px-4 text-xs font-bold uppercase tracking-[1.4px] text-white transition-colors duration-150 hover:bg-accent-hover"
      >
        {t.updatePrompt.action}
      </button>

      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false);
        }}
        aria-label={t.updatePrompt.close}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:text-fg"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
