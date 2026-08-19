import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingService } from '../services/settingService';
import { authService } from '../services/authService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const queryClient = useQueryClient();
  const currentUser = authService.getCurrentUser();
  const currentUserId = currentUser?.id || currentUser?._id;
  const isAuthenticated = authService.isAuthenticated();

  const { data: settingsApi, isLoading, refetch } = useQuery({
    queryKey: ['shop-settings-global', currentUserId, isAuthenticated],
    queryFn: () => settingService.getSettings(),
    staleTime: 10 * 60 * 1000, // 10 mins caching
    refetchOnWindowFocus: false,
    enabled: isAuthenticated && !!currentUserId,
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

  const value = useMemo(
    () => ({
      settings,
      isLoading: isLoading && isAuthenticated && !!currentUserId,
      refetchSettings: refetch,
      updateSettings: updateMutation.mutateAsync,
      patchSettings: patchMutation.mutateAsync,
      resetSettings: resetMutation.mutateAsync,
      isUpdating: updateMutation.isPending || patchMutation.isPending || resetMutation.isPending,
    }),
    [settings, isLoading, isAuthenticated, currentUserId, refetch, updateMutation, patchMutation, resetMutation]
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
