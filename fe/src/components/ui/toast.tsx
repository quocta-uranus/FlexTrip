'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: 'success' | 'error';
  position?: 'center' | 'top-right';
}

export function Toast({
  show,
  message,
  onClose,
  duration,
  variant = 'success',
  position = 'center',
}: ToastProps) {
  const resolvedDuration = duration ?? (variant === 'error' ? 5000 : 3000);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, resolvedDuration);
    return () => clearTimeout(timer);
  }, [show, resolvedDuration, onClose]);

  if (!show) return null;

  const positionClass = position === 'top-right'
    ? 'fixed right-3 top-20 z-[100] w-[calc(100%-1.5rem)] sm:right-6 sm:top-24 sm:w-auto sm:max-w-sm'
    : 'fixed inset-0 z-50 flex items-center justify-center';

  return (
    <div className={`${positionClass} pointer-events-none`}>
      <div className="pointer-events-auto animate-bounce-in w-full sm:w-auto">
        <div className={`flex items-center gap-3 rounded-2xl px-6 py-4 text-white shadow-2xl ${variant === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {variant === 'error' ? <XCircle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
          <span className="text-base font-semibold whitespace-pre-line">{message}</span>
        </div>
      </div>
    </div>
  );
}
