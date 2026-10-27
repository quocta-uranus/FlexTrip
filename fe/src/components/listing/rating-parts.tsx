/* eslint-disable @next/next/no-img-element */
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({ rating, count, size = 'md' }: { rating: number; count?: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSz = size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn(sz, s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
      ))}
      <span className={cn('ml-0.5 font-bold text-ink', textSz)}>{rating.toFixed(1)}</span>
      {count != null && <span className={cn('text-slate-400', textSz)}>({count} đánh giá)</span>}
    </span>
  );
}

export function Avatar({ src, name, className }: { src?: string | null; name: string; className: string }) {
  return src ? (
    <img src={src} alt={name} className={cn('shrink-0 object-cover', className)} />
  ) : (
    <div className={cn('flex shrink-0 items-center justify-center bg-linear-to-br from-brand-blue to-brand-mint font-bold text-white', className)}>
      {name.charAt(0)}
    </div>
  );
}
