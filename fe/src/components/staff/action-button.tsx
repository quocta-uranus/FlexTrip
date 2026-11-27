import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ActionVariant = 'primary-emerald' | 'primary-blue' | 'primary-red' | 'warn' | 'success' | 'neutral';

const VARIANT: Record<ActionVariant, string> = {
  'primary-emerald':
    'bg-emerald-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.32),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(5,150,105,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] focus-visible:ring-emerald-500/40',
  'primary-blue':
    'bg-[#2a7bd9] text-white shadow-[0_6px_16px_rgba(42,123,217,0.32),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[#1e5aa8] hover:shadow-[0_8px_20px_rgba(42,123,217,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] focus-visible:ring-blue-500/40',
  'primary-red':
    'bg-red-600 text-white shadow-[0_6px_16px_rgba(220,38,38,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-red-700 hover:shadow-[0_8px_20px_rgba(220,38,38,0.36),inset_0_1px_0_rgba(255,255,255,0.18)] focus-visible:ring-red-500/40',
  // Amber on purpose: it is the colour of the mediation dialog this button opens.
  warn: 'border border-amber-300 bg-white text-amber-800 hover:border-amber-400 hover:bg-amber-50 focus-visible:ring-amber-400/40',
  success: 'border border-emerald-300 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 focus-visible:ring-emerald-400/40',
  neutral: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400/40',
};

const SIZE = {
  md: 'h-11 px-5 text-sm',
  sm: 'h-9 px-3.5 text-[13px]',
} as const;

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ActionVariant;
  size?: keyof typeof SIZE;
}

// One button look for every action in the staff area: tall, rounded, one strong primary and quiet secondaries.
// Same look for a link that must stay a real <a> (ctrl-click, open in new tab).
export function actionButtonClass(variant: ActionVariant, size: keyof typeof SIZE = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl transition-all focus-visible:outline-none focus-visible:ring-[3px] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:scale-100 [&_svg]:shrink-0',
    variant.startsWith('primary') ? 'font-semibold' : 'font-medium',
    SIZE[size],
    VARIANT[variant],
    className,
  );
}

export function ActionButton({ variant, size = 'md', className, type = 'button', ...props }: ActionButtonProps) {
  return <button type={type} className={actionButtonClass(variant, size, className)} {...props} />;
}
