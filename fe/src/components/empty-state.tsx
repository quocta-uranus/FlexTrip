import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border bg-card px-10 py-20 text-center">
      <div className="mb-3 flex size-24 items-center justify-center rounded-full bg-sec-50">
        <Icon className="size-11 text-sec-300" strokeWidth={1.75} />
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
