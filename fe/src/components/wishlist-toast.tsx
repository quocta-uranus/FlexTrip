'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toast } from '@/components/ui/toast';

type ToastState = { message: string; variant: 'success' | 'error' } | null;

const WishlistToastContext = createContext<{
  show: (message: string, variant: 'success' | 'error') => void;
} | null>(null);

export function WishlistToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const show = useCallback((message: string, variant: 'success' | 'error') => {
    setToast({ message, variant });
  }, []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <WishlistToastContext.Provider value={value}>
      {children}
      <Toast
        show={toast !== null}
        message={toast?.message ?? ''}
        variant={toast?.variant}
        position="top-right"
        duration={3000}
        onClose={() => setToast(null)}
      />
    </WishlistToastContext.Provider>
  );
}

export function useWishlistToast() {
  const context = useContext(WishlistToastContext);
  if (!context) throw new Error('useWishlistToast must be used inside WishlistToastProvider');
  return context;
}
