/* VEDIXA ERP Service Worker for Web Push & Background Notifications */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_e) {
      data = { title: 'VEDIXA ERP Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'VEDIXA ERP Notification';
  const origin = self.location.origin;

  const options = {
    body: data.body || 'You have a new update in VEDIXA ERP.',
    icon: data.icon && data.icon.startsWith('http') ? data.icon : `${origin}/apple-touch-icon.png`,
    badge: data.badge && data.badge.startsWith('http') ? data.badge : `${origin}/favicon-32x32.png`,
    tag: data.tag || `vedixa-push-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    timestamp: Date.now(),
    actions: [
      { action: 'open', title: 'Open VEDIXA' }
    ],
    data: {
      url: data.url || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';
  const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Look for an existing open VEDIXA ERP window/tab
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client && client.url !== fullTargetUrl) {
              client.navigate(fullTargetUrl);
            }
            return;
          }
        }
        // If no window is open, open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullTargetUrl);
        }
      })
  );
});
