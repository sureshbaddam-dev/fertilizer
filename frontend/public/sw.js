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
  const options = {
    body: data.body || 'You have a new update in VEDIXA ERP.',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || `notif-${Date.now()}`,
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
