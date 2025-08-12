// This is the service worker file for the EcoSnap PWA.

// Define a unique name for the cache. 
// It's a good practice to include a version number.
const CACHE_NAME = 'ecosnap-cache-v2.9';

// List all the files that the app needs to function offline.
const urlsToCache = [
  '/', // The root of the site (the index.html file)
  '/index.html',
  '/style/theme.css',
  '/style/style.css',
  '/scripts/app.js',
  '/scripts/camera.js',
  '/scripts/ai.js',
  '/scripts/ui.js',
  '/manifest.json',
  // External resources from CDNs
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// --- Installation Event ---
// This event fires when the service worker is first installed.
self.addEventListener('install', event => {
  // We wait until the installation is complete before moving on.
  event.waitUntil(
    // Open the cache by name.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the specified files to the cache.
        return cache.addAll(urlsToCache);
      })
  );
});

// --- Fetch Event ---
// This event fires every time the app requests a resource (e.g., a file, an image).
self.addEventListener('fetch', event => {
  event.respondWith(
    // Check if the requested resource is already in our cache.
    caches.match(event.request)
      .then(response => {
        // If we have a cached version of the resource, return it immediately.
        if (response) {
          return response;
        }
        // If the resource is not in the cache, fetch it from the network.
        return fetch(event.request);
      }
    )
  );
});
