import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      {icon !== undefined && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-brand-600 dark:text-brand-400">
          {icon}
        </span>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description !== undefined && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action !== undefined && <div className="mt-1">{action}</div>}
    </section>
  );
}
