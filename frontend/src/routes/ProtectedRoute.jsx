import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VedixaWorkspaceLoader from '../components/common/VedixaWorkspaceLoader';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isAuthReady } = useAuth();

  // If auth is still resolving on initial load, show branded workspace loader
  // NEVER redirect while auth initialization is still pending!
  if (!isAuthReady) {
    return (
      <VedixaWorkspaceLoader
        message="Preparing your workspace..."
        subtext="Verifying secure access session"
      />
    );
  }

  // Only redirect after initialization confirms there is no valid session
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isAuthReady, user } = useAuth();

  if (!isAuthReady) {
    return (
      <VedixaWorkspaceLoader
        message="Preparing your workspace..."
        subtext="Loading application modules"
      />
    );
  }

  if (isAuthenticated) {
    const isComplete = Boolean(
      user?.isProfileComplete ||
      (user?.ownerName &&
        user?.ownerName !== 'Pending Setup' &&
        user?.mobile &&
        !String(user.mobile).startsWith('pending_'))
    );

    if (!isComplete) {
      return <Navigate to="/shop-setup" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
