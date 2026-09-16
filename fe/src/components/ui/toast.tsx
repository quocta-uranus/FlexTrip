'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ show, message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto animate-bounce-in">
        <div className="flex items-center gap-3 rounded-2xl bg-green-600 px-6 py-4 text-white shadow-2xl">
          <CheckCircle className="h-6 w-6" />
          <span className="text-base font-semibold">{message}</span>
        </div>
      </div>
    </div>
  );
}
