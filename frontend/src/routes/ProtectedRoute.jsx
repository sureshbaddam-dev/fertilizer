import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isAuth, setIsAuth] = useState(() => authService.isAuthenticated());
  const [isInitializing, setIsInitializing] = useState(() => authService.isInitializing);

  useEffect(() => {
    // Sync state on mount in case authService initialized before effect ran
    setIsAuth(authService.isAuthenticated());
    setIsInitializing(authService.isInitializing);

    const unsubscribe = authService.subscribe(() => {
      setIsAuth(authService.isAuthenticated());
      setIsInitializing(authService.isInitializing);
    });
    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wide text-emerald-400">Authenticating Session...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying secure access token</p>
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const [isAuth, setIsAuth] = useState(() => authService.isAuthenticated());
  const [isInitializing, setIsInitializing] = useState(() => authService.isInitializing);

  useEffect(() => {
    // Sync state on mount in case authService initialized before effect ran
    setIsAuth(authService.isAuthenticated());
    setIsInitializing(authService.isInitializing);

    const unsubscribe = authService.subscribe(() => {
      setIsAuth(authService.isAuthenticated());
      setIsInitializing(authService.isInitializing);
    });
    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wide text-emerald-400">Loading App...</p>
      </div>
    );
  }

  if (isAuth) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}


