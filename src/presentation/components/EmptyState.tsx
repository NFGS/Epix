import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon !== undefined && <span className="mb-1 text-muted">{icon}</span>}
      <h2 className="text-base font-bold">{title}</h2>
      {description !== undefined && (
        <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action !== undefined && <div className="mt-3">{action}</div>}
    </section>
  );
}
