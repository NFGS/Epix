interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Etiqueta accesible; `aria-checked` refleja el estado. */
  label: string;
}

/**
 * Interruptor accesible compartido (R-11): mismo patrón visual y de teclado
 * para Notificaciones y Telemetría. Touch target de 44 px y foco visible.
 */
export function Switch({ checked, onCheckedChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        onCheckedChange(!checked);
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        className={[
          'relative h-6 w-11 rounded-full transition-colors duration-150',
          checked ? 'bg-accent' : 'bg-surface-2',
        ].join(' ')}
      >
        <span
          className={[
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-5' : '',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
