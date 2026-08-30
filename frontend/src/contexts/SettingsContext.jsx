import React, { createContext, useContext, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingService } from '../services/settingService';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?.id || user?._id;

  const { data: settingsApi, isLoading, refetch } = useQuery({
    queryKey: ['shop-settings-global', currentUserId, isAuthenticated],
    queryFn: () => settingService.getSettings(),
    staleTime: 10 * 60 * 1000, // 10 mins caching
    refetchOnWindowFocus: false,
    enabled: Boolean(isAuthenticated && currentUserId),
  });

  const settings = useMemo(() => {
    return settingsApi?.data || settingsApi || {};
  }, [settingsApi]);

  const updateMutation = useMutation({
    mutationFn: (newSettings) => settingService.updateSettings(newSettings),
    onSuccess: (updatedRes) => {
      if (updatedRes) {
        queryClient.setQueryData(['shop-settings-global', currentUserId, isAuthenticated], updatedRes);
      }
      queryClient.invalidateQueries(['shop-settings-global']);
      queryClient.invalidateQueries(['shop-settings-profile']);
      queryClient.invalidateQueries(['user-profile']);
    },
  });

  const patchMutation = useMutation({
    mutationFn: (patchData) => settingService.patchSettings(patchData),
    onSuccess: (updatedRes) => {
      if (updatedRes) {
        queryClient.setQueryData(['shop-settings-global', currentUserId, isAuthenticated], updatedRes);
      }
      queryClient.invalidateQueries(['shop-settings-global']);
      queryClient.invalidateQueries(['shop-settings-profile']);
      queryClient.invalidateQueries(['user-profile']);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => settingService.resetSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-settings-global']);
      queryClient.invalidateQueries(['shop-settings-profile']);
      queryClient.invalidateQueries(['user-profile']);
    },
  });

  const updateRef = useRef(updateMutation.mutateAsync);
  const patchRef = useRef(patchMutation.mutateAsync);
  const resetRef = useRef(resetMutation.mutateAsync);

  updateRef.current = updateMutation.mutateAsync;
  patchRef.current = patchMutation.mutateAsync;
  resetRef.current = resetMutation.mutateAsync;

  const updateSettings = useCallback((newSettings) => updateRef.current(newSettings), []);
  const patchSettings = useCallback((patchData) => patchRef.current(patchData), []);
  const resetSettings = useCallback(() => resetRef.current(), []);
  const isUpdating = updateMutation.isPending || patchMutation.isPending || resetMutation.isPending;

  const isInitialLoading = isLoading && !settingsApi && isAuthenticated && !!currentUserId;

  const value = useMemo(
    () => ({
      settings,
      isLoading: isInitialLoading,
      refetchSettings: refetch,
      updateSettings,
      patchSettings,
      resetSettings,
      isUpdating,
    }),
    [settings, isInitialLoading, refetch, updateSettings, patchSettings, resetSettings, isUpdating]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
