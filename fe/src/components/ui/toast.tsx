'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: 'success' | 'error';
}

export function Toast({ show, message, onClose, duration, variant = 'success' }: ToastProps) {
  const resolvedDuration = duration ?? (variant === 'error' ? 5000 : 3000);

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, resolvedDuration);
    return () => clearTimeout(timer);
  }, [show, resolvedDuration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto animate-bounce-in">
        <div className={`flex items-center gap-3 rounded-2xl px-6 py-4 text-white shadow-2xl ${variant === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {variant === 'error' ? <XCircle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
          <span className="text-base font-semibold whitespace-pre-line">{message}</span>
        </div>
      </div>
    </div>
  );
}
