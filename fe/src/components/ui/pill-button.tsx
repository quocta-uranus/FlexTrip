'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PillButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick?: React.MouseEventHandler<HTMLElement>;
  variant?: 'primary' | 'brand' | 'dark' | 'ghost' | 'outline' | 'amber-outline' | 'on-dark' | 'glass';
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
      onClick,
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
        'bg-brand hover:bg-sky-700 shadow-[0_2px_10px_rgba(0,180,234,0.35)] focus-visible:ring-brand',
      brand:
        'bg-gradient-to-r from-brand-blue to-brand hover:brightness-105 shadow-[0_4px_16px_rgba(0,180,234,0.35)] focus-visible:ring-brand',
      dark:
        'bg-ink hover:bg-ink/90 shadow-[0_2px_10px_rgba(10,37,51,0.25)] focus-visible:ring-ink',
      ghost:
        'bg-white/85 hover:bg-white border border-sky-100 shadow-xs hover:shadow focus-visible:ring-sky-200',
      outline:
        'bg-transparent hover:bg-sky-50 border border-sky-200 focus-visible:ring-sky-200',
      'amber-outline':
        'bg-transparent hover:bg-brand/10 border border-brand focus-visible:ring-brand',
      'on-dark':
        'bg-white hover:bg-sky-50 shadow-md focus-visible:ring-white',
      glass:
        'bg-white/10 hover:bg-white/20 border border-white/40 backdrop-blur-sm focus-visible:ring-white',
    };
    // Màu chữ đặt trên thẻ span bên trong vì `a { color: inherit }` trong globals.css
    // nằm ngoài @layer nên thắng mọi utility text-* đặt trực tiếp trên <Link>.
    const textStyles = {
      primary: 'text-white',
      brand: 'text-white',
      dark: 'text-white',
      ghost: 'text-ink',
      outline: 'text-sky-700',
      'amber-outline': 'text-ink',
      'on-dark': 'text-ink',
      glass: 'text-white',
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
          textStyles[variant],
          arrowClassName
        )}
      >
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    ) : null;

    if (href) {
      return (
        <Link href={href} className={combinedClassName} onClick={onClick}>
          <span className={textStyles[variant]}>{children}</span>
          {arrowElement}
        </Link>
      );
    }

    return (
      <button ref={ref} className={combinedClassName} onClick={onClick} {...props}>
        <span className={textStyles[variant]}>{children}</span>
        {arrowElement}
      </button>
    );
  }
);

PillButton.displayName = 'PillButton';
