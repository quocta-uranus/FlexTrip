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

  // Top-right is the quiet style for admin screens: it never covers the table the admin is working on.
  if (position === 'top-right') {
    const isError = variant === 'error';
    return (
      <div className={`${positionClass} pointer-events-none`} role="status" aria-live="polite">
        <div className="pointer-events-auto animate-bounce-in w-full sm:w-auto">
          <div
            className={`flex items-start gap-3 rounded-xl border border-l-4 bg-white px-4 py-3 shadow-lg ${
              isError ? 'border-red-100 border-l-red-500' : 'border-green-100 border-l-green-500'
            }`}
          >
            {isError
              ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              : <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />}
            <span className="text-sm font-medium whitespace-pre-line text-slate-800">{message}</span>
          </div>
        </div>
      </div>
    );
  }

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
