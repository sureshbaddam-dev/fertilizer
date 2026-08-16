import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { adminRouter } from './routes/adminRouter';

export default function App() {
  return <RouterProvider router={adminRouter} />;
}
