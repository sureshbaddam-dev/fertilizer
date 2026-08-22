// Centralized Google Identity Services (GIS) Manager
// Ensures single script loading and single initialization across React mounts & StrictMode

let scriptPromise = null;
let initializedClientId = null;

export const getGoogleClientId = () => {
  let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  if (typeof clientId === 'string') {
    clientId = clientId.replace(/^["']|["']$/g, '').trim();
  }
  return clientId;
};

export const loadGoogleGisScript = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
    return Promise.resolve(true);
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      if (window.google?.accounts) {
        resolve(true);
      } else {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return scriptPromise;
};

// Global single initialization of google.accounts.id
export const initGoogleIdClientOnce = (clientId, callback) => {
  if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) return false;
  if (initializedClientId === clientId) {
    return true; // Already initialized once
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback,
      auto_select: false,
    });
    initializedClientId = clientId;

    if (import.meta.env.DEV) {
      console.log('[Google Auth] GIS Client Initialized ONCE');
      console.log('[Google Auth] Current origin:', window.location.origin);
      console.log('[Google Auth] Client ID:', clientId);
    }
    return true;
  } catch (err) {
    console.error('[GIS] Failed to initialize google.accounts.id:', err);
    return false;
  }
};
