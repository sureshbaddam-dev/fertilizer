import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { normalizeUser } from '../utils/imageUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // Initialize synchronous state from storage
  const [token, setToken] = useState(() => authService.getAccessToken());
  const [user, setUser] = useState(() => {
    const raw = authService.getCurrentUser();
    return normalizeUser(raw);
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Sync state helper
  const applyAuthData = useCallback(
    (userData, accessToken = null) => {
      const normalized = normalizeUser(userData);
      setUser(normalized);
      if (accessToken) {
        setToken(accessToken);
      }
      if (normalized) {
        queryClient.setQueryData(['user-profile'], { success: true, data: normalized });
      }
    },
    [queryClient]
  );

  // App startup / bootstrap session check
  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const storedToken = authService.getAccessToken();
        const storedUser = authService.getCurrentUser();

        if (!storedToken) {
          if (isMounted) {
            setUser(null);
            setToken(null);
            setIsAuthReady(true);
          }
          return;
        }

        // Set initial normalized user from cache for immediate render
        if (storedUser && isMounted) {
          applyAuthData(storedUser, storedToken);
        }

        // Validate and refresh session if needed
        await authService.initAuth();

        const currentToken = authService.getAccessToken();
        const currentUser = authService.getCurrentUser();

        if (isMounted) {
          if (currentToken && currentUser) {
            applyAuthData(currentUser, currentToken);
          } else if (!currentToken) {
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session bootstrap error:', err);
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    // Listen to external auth events (e.g. force logout from 401 interceptor)
    const unsubscribe = authService.subscribe(() => {
      if (!isMounted) return;
      const curToken = authService.getAccessToken();
      const curUser = authService.getCurrentUser();
      if (!curToken) {
        setUser(null);
        setToken(null);
      } else if (curUser) {
        applyAuthData(curUser, curToken);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [applyAuthData]);

  // Login handler
  const login = useCallback(
    async (credentials) => {
      setAuthLoading(true);
      try {
        const response = await authService.login(credentials);
        if (response.success && response.data) {
          const resData = response.data;
          const userPayload = resData.user || resData;
          const accessToken = resData.accessToken;

          // Normalize user immediately
          const normalized = normalizeUser(userPayload);
          setUser(normalized);
          setToken(accessToken || authService.getAccessToken());
          setIsAuthReady(true);

          // Prime React Query caches immediately so downstream queries don't lag
          queryClient.setQueryData(['user-profile'], { success: true, data: normalized });
          try {
            queryClient.invalidateQueries(['shop-settings-global']);
            queryClient.invalidateQueries(['my-subscription']);
          } catch (_e) {}
        }
        return response;
      } finally {
        setAuthLoading(false);
      }
    },
    [queryClient]
  );

  // Google Auth handler
  const loginWithGoogle = useCallback(
    async (idToken) => {
      setAuthLoading(true);
      try {
        const response = await authService.googleAuth(idToken);
        if (response.success && response.data) {
          const resData = response.data;
          const userPayload = resData.user || resData;
          const accessToken = resData.accessToken;

          const normalized = normalizeUser(userPayload);
          setUser(normalized);
          setToken(accessToken || authService.getAccessToken());
          setIsAuthReady(true);

          queryClient.setQueryData(['user-profile'], { success: true, data: normalized });
          try {
            queryClient.invalidateQueries(['shop-settings-global']);
            queryClient.invalidateQueries(['my-subscription']);
          } catch (_e) {}
        }
        return response;
      } finally {
        setAuthLoading(false);
      }
    },
    [queryClient]
  );

  // Logout handler
  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      queryClient.clear();
      setAuthLoading(false);
    }
  }, [queryClient]);

  // Update user profile reactively
  const updateUser = useCallback(
    (newUserData) => {
      const merged = { ...(user || {}), ...(newUserData || {}) };
      const normalized = normalizeUser(merged);
      setUser(normalized);
      localStorage.setItem('vedixa_user', JSON.stringify(normalized));
      localStorage.setItem('mandhi_user', JSON.stringify(normalized));
      queryClient.setQueryData(['user-profile'], { success: true, data: normalized });
    },
    [user, queryClient]
  );

  const isAuthenticated = Boolean(token && user);

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isAuthReady,
      authLoading,
      login,
      loginWithGoogle,
      logout,
      updateUser,
    }),
    [user, token, isAuthenticated, isAuthReady, authLoading, login, loginWithGoogle, logout, updateUser]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
