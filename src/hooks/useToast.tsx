import { useState, useCallback } from 'react';

export interface ToastState {
  open: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
}

export const useToast = () => {
  const [toastState, setToastState] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showToast = useCallback((message: string, severity: ToastState['severity'] = 'info') => {
    setToastState({
      open: true,
      message,
      severity,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToastState(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  return {
    toastState,
    showToast,
    hideToast,
  };
};
