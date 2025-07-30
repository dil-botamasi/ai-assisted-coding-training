import React from 'react';
import { Snackbar, Alert } from '@mui/material';

export interface ToastProps {
  open: boolean;
  message: string;
  severity?: 'error' | 'warning' | 'info' | 'success';
  onClose: () => void;
  autoHideDuration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 6000,
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
