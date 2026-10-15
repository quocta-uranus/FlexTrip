'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: 'left' | 'center' | 'between';
  theme?: 'light' | 'dark';
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  theme = 'light',
  className,
}: SectionHeaderProps) {
  const isDark = theme === 'dark';

  const containerClasses = {
    left: 'text-left max-w-2xl',
    center: 'text-center max-w-3xl mx-auto',
    between: 'flex flex-col md:flex-row md:items-end md:justify-between gap-6 w-full',
  };

  return (
    <div className={cn('mb-10 sm:mb-14', containerClasses[align], className)}>
      <div className={align === 'between' ? 'max-w-2xl' : ''}>
        {eyebrow && (
          <p
            className={cn(
              'text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] mb-3',
              isDark ? 'text-[#A6A29A]' : 'text-[#7A766F]'
            )}
          >
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight leading-[1.15]',
            isDark ? 'text-white' : 'text-[#141312]'
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-4 text-base sm:text-lg leading-relaxed',
              isDark ? 'text-[#B5B1A8]' : 'text-[#68655E]'
            )}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className={cn('shrink-0', align === 'center' ? 'mt-6' : '')}>
          {action}
        </div>
      )}
    </div>
  );
}
