import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);

  // Register Service Worker & check subscription on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        setSwRegistration(reg);
        return reg.pushManager.getSubscription();
      })
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch((_err) => {
        // Service worker registration error silently caught
      });
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!('Notification' in window) || !swRegistration) {
      throw new Error('Web Push is not supported on this device/browser.');
    }

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        throw new Error('Notification permission was denied.');
      }

      // Fetch VAPID public key from backend
      const res = await apiClient.get('/notifications/vapid-public-key');
      const publicKey = res.data?.publicKey || res.publicKey;

      if (!publicKey) {
        throw new Error('VAPID public key unavailable from server.');
      }

      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // Send push subscription payload to backend
      const subJson = subscription.toJSON();
      await apiClient.post('/notifications/subscribe', subJson);

      setIsSubscribed(true);
      return subscription;
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!swRegistration) return;
    setIsLoading(true);
    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await apiClient.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (_err) {
      // Unsubscribe error silently caught
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration]);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
