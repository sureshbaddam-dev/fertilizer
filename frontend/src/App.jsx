import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { appRouter } from './routes/appRouter';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { queryClient } from './utils/queryClient';

import { ToastProvider } from './contexts/ToastContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <RouterProvider router={appRouter} />
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
