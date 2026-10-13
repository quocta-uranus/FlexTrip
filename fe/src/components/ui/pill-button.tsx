'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'dark' | 'ghost' | 'outline' | 'amber-outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  showArrow?: boolean;
  arrowClassName?: string;
  children: React.ReactNode;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      href,
      showArrow = true,
      arrowClassName,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'group inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

    const sizeStyles = {
      sm: 'text-xs px-3.5 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-5 py-2.5 gap-2 h-10',
      lg: 'text-base px-6 py-3.5 gap-2.5 h-12',
    };

    const variantStyles = {
      primary:
        'bg-[#F4B942] hover:bg-[#E8AB30] text-[#141312] shadow-[0_2px_10px_rgba(244,185,66,0.35)] focus-visible:ring-[#F4B942]',
      brand:
        'bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] hover:brightness-105 text-white shadow-[0_4px_16px_rgba(0,163,255,0.35)] focus-visible:ring-[#00A3FF]',
      dark:
        'bg-[#0B2238] hover:bg-[#12314E] text-white shadow-[0_2px_10px_rgba(11,34,56,0.25)] focus-visible:ring-[#0B2238]',
      ghost:
        'bg-white/85 hover:bg-white text-[#0A1C2A] border border-sky-100 shadow-xs hover:shadow focus-visible:ring-sky-200',
      outline:
        'bg-transparent hover:bg-sky-50 text-[#097dae] border border-sky-200 focus-visible:ring-sky-300',
      'amber-outline':
        'bg-transparent hover:bg-[#F4B942]/10 text-[#141312] border border-[#F4B942] focus-visible:ring-[#F4B942]',
    };

    const combinedClassName = cn(
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      className
    );

    const arrowElement = showArrow ? (
      <span
        className={cn(
          'inline-flex items-center justify-center transition-transform duration-200 ease-out group-hover:translate-x-1',
          variant === 'primary' ? 'text-[#141312]' : '',
          variant === 'dark' ? 'text-white' : '',
          arrowClassName
        )}
      >
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    ) : null;

    if (href) {
      return (
        <Link href={href} className={combinedClassName}>
          <span>{children}</span>
          {arrowElement}
        </Link>
      );
    }

    return (
      <button ref={ref} className={combinedClassName} {...props}>
        <span>{children}</span>
        {arrowElement}
      </button>
    );
  }
);

PillButton.displayName = 'PillButton';
