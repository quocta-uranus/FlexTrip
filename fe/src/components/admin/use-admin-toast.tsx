'use client';

import { useCallback, useState } from 'react';
import { Toast } from '@/components/ui/toast';

export function useAdminToast() {
  const [state, setState] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const success = useCallback((message: string) => setState({ message, variant: 'success' }), []);
  const error = useCallback((err: unknown) => setState({ message: err instanceof Error ? err.message : 'Đã có lỗi xảy ra', variant: 'error' }), []);
  const close = useCallback(() => setState(null), []);
  const node = <Toast show={state !== null} message={state?.message ?? ''} variant={state?.variant} onClose={close} />;
  return { success, error, node };
}
