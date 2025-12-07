// Service Worker for ohh - Web3 Task Manager
// Handles push notifications for task reminders even when app is closed

// Service Worker Version - Update this to force update
const CACHE_VERSION = 'ohh-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/ohh.jsx',
  '/ethereum-utils.js',
  '/ethereum-examples.js',
  '/ohh icon.jpeg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('✅ Service Worker: Caching assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        console.log('⚠️ Service Worker: Offline and no cache available');
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Service Worker: Push notification received', event);

  let notificationData = {
    title: 'ohh - Task Reminder',
    body: 'You have a task reminder!',
    icon: '/ohh icon.jpeg',
    badge: '/ohh icon.jpeg',
    vibrate: [200, 100, 200],
    tag: 'ohh-reminder',
    requireInteraction: true, // Keep notification visible until user interacts
    actions: [
      {
        action: 'view',
        title: '👀 View Task',
        icon: '/ohh icon.jpeg'
      },
      {
        action: 'dismiss',
        title: '✖️ Dismiss',
        icon: '/ohh icon.jpeg'
      }
    ],
    data: {
      url: '/',
      taskId: null
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        data: {
          url: payload.url || '/',
          taskId: payload.taskId || null
        }
      };
    } catch (error) {
      console.error('❌ Service Worker: Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  // Show notification
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      data: notificationData.data
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Notification clicked', event.action);
  
  event.notification.close(); // Close the notification

  // Handle different actions
  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // Just close - already handled above
    console.log('✖️ Service Worker: Notification dismissed');
  } else {
    // Default action (clicking notification body) - open app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (let client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          // If not open, open new window
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Notification close event - track dismissals
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Service Worker: Notification closed without action');
  // Could track this for analytics
});

// Background sync event - for future offline support
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

// Periodic background sync - check for due tasks (experimental API)
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Service Worker: Periodic sync triggered', event.tag);
  
  if (event.tag === 'check-tasks') {
    event.waitUntil(checkDueTasks());
  }
});

// Helper function: Sync tasks (placeholder)
async function syncTasks() {
  console.log('🔄 Service Worker: Syncing tasks...');
  // In production, sync with backend API
  return Promise.resolve();
}

// Helper function: Check for due tasks
async function checkDueTasks() {
  console.log('⏰ Service Worker: Checking for due tasks...');
  
  try {
    // Get stored tasks from IndexedDB or send request to backend
    // For now, we'll use a simple localStorage check
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      // Send message to active clients to check tasks
      clients.forEach(client => {
        client.postMessage({
          type: 'CHECK_DUE_TASKS',
          timestamp: Date.now()
        });
      });
    } else {
      // No active clients - could trigger notification directly
      console.log('📭 Service Worker: No active clients to check tasks');
    }
  } catch (error) {
    console.error('❌ Service Worker: Error checking due tasks:', error);
  }
}

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

console.log('✅ Service Worker loaded successfully!');
