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
  const [isIosPwa, setIsIosPwa] = useState(false);

  // Register Service Worker & check subscription on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isStandalone) {
      setIsIosPwa(true);
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        setSwRegistration(reg);
        return reg.pushManager.getSubscription();
      })
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch((_err) => {
        // Service worker registration error silently handled
      });
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isStandalone) {
      throw new Error('On iOS (iPhone/iPad), Web Push requires adding VEDIXA to your Home Screen as an App.');
    }

    if (!('Notification' in window) || !('PushManager' in window)) {
      throw new Error('Web Push is not supported on this device or browser version.');
    }

    setIsLoading(true);
    try {
      let reg = swRegistration;
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        await navigator.serviceWorker.ready;
        setSwRegistration(reg);
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        throw new Error('Notification permission was denied. Please allow notifications in browser settings.');
      }

      // Fetch VAPID public key from backend
      const res = await apiClient.get('/notifications/vapid-public-key');
      const publicKey = res.data?.publicKey || res.publicKey;

      if (!publicKey) {
        throw new Error('VAPID public key unavailable from server.');
      }

      // Unsubscribe any stale existing subscription first
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        try {
          await existingSub.unsubscribe();
        } catch (_e) {}
      }

      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
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
    isIosPwa,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
