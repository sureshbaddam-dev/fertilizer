import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { appRouter } from './routes/appRouter';
import { SettingsProvider } from './contexts/SettingsContext';
import { queryClient } from './utils/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <RouterProvider router={appRouter} />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
