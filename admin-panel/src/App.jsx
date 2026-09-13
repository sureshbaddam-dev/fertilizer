import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { adminRouter } from './routes/adminRouter';
import AdminErrorBoundary from './components/common/AdminErrorBoundary';

export default function App() {
  return (
    <AdminErrorBoundary>
      <RouterProvider router={adminRouter} />
    </AdminErrorBoundary>
  );
}
