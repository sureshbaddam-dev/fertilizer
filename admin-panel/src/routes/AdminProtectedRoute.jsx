import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { adminApiService } from '../services/adminApiService';

export default function AdminProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const savedUserStr = localStorage.getItem('adminUser');
      let savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      const isAdminRole = (role) =>
        ['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(role);

      if (token && savedUser && isAdminRole(savedUser.role)) {
        if (isMounted) setIsAuthenticated(true);
        return;
      }

      // Try refresh token
      try {
        const res = await adminApiService.refreshAdminToken();
        if (res?.user && isAdminRole(res.user.role)) {
          localStorage.setItem('adminUser', JSON.stringify(res.user));
          if (isMounted) setIsAuthenticated(true);
        } else {
          if (isMounted) setIsAuthenticated(false);
        }
      } catch (_err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('adminUser');
        if (isMounted) setIsAuthenticated(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
