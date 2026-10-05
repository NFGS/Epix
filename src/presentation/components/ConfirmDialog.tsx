import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo de confirmación accesible: role dialog, aria-modal, cierre con Esc,
 * foco inicial en «Cancelar», focus trap con Tab (R-06), restauración del foco
 * al cerrar y entrada de 200 ms (DESIGN §6).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    // R-06: recuerda quién tenía el foco para devolvérselo al cerrar.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    const focusableElements = (): HTMLElement[] => {
      const root = dialogRef.current;
      if (root === null) {
        return [];
      }

      return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (first === undefined || last === undefined) {
        return;
      }

      const active = document.activeElement;
      const isInside = active instanceof HTMLElement && dialogRef.current?.contains(active) === true;

      if (event.shiftKey) {
        if (!isInside || active === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!isInside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="absolute inset-0 bg-scrim animate-[epix-fade-in_200ms_cubic-bezier(0.2,0,0,1)]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-sm rounded-[20px] border border-border bg-surface p-5 shadow-dialog animate-[epix-dialog-in_200ms_cubic-bezier(0.2,0,0,1)]"
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full bg-surface-2 px-5 text-xs font-bold uppercase tracking-[1.4px] text-fg transition-colors duration-150 hover:text-accent-text"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-full bg-danger px-5 text-xs font-bold uppercase tracking-[1.4px] text-white transition-opacity duration-150 hover:opacity-90 dark:text-bg"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
