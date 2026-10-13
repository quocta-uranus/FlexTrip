'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number; // ms
  duration?: number; // ms
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number; // px
  threshold?: number;
  once?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  duration = 650,
  direction = 'up',
  distance = 24,
  threshold = 0.15,
  once = true,
  className,
  style,
  ...props
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    const currentEl = elementRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [threshold, once]);

  const getTransform = () => {
    if (isVisible) return 'none';
    switch (direction) {
      case 'up':
        return `translateY(${distance}px)`;
      case 'down':
        return `translateY(-${distance}px)`;
      case 'left':
        return `translateX(${distance}px)`;
      case 'right':
        return `translateX(-${distance}px)`;
      case 'none':
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={elementRef}
      className={cn('will-change-[opacity,transform]', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.21, 0.47, 0.32, 0.98)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  staggerDelay?: number; // ms between items
  threshold?: number;
}

export function StaggerContainer({
  children,
  staggerDelay = 90,
  threshold = 0.1,
  className,
  ...props
}: StaggerContainerProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        }
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={containerRef} className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 600ms cubic-bezier(0.21, 0.47, 0.32, 0.98) ${index * staggerDelay}ms, transform 600ms cubic-bezier(0.21, 0.47, 0.32, 0.98) ${index * staggerDelay}ms`,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
