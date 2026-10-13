'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PillBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'amber' | 'stone' | 'dark' | 'success' | 'outline';
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function PillBadge({
  variant = 'stone',
  dot = false,
  dotColor,
  icon,
  className,
  children,
  ...props
}: PillBadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide select-none transition-colors';

  const variantStyles = {
    amber: 'bg-[#F4B942]/15 text-[#8F6100] border border-[#F4B942]/30',
    stone: 'bg-white/85 text-[#4A4843] border border-black/8 shadow-sm backdrop-blur-sm',
    dark: 'bg-[#161513] text-white/90 border border-white/10',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    outline: 'bg-transparent text-[#68655E] border border-black/15',
  };

  const defaultDotColors = {
    amber: 'bg-[#F4B942]',
    stone: 'bg-[#F4B942]',
    dark: 'bg-emerald-400',
    success: 'bg-emerald-500',
    outline: 'bg-[#68655E]',
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0 animate-pulse',
            dotColor || defaultDotColors[variant]
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
