// Vektor's service worker. It does two jobs for the app's own files (the page, scripts, styles and icons):
//   1. Online, it always asks the server for the current copy, so an update arrives as a whole and the browser
//      never mixes an old script with a new one.
//   2. It keeps the last copy of each file, so the app still opens with no connection.
// It never touches anything else: requests to Supabase and to other sites go straight to the network, and no
// account data is stored here.

const CACHE = 'vektor-shell';
// Fetched when the worker is installed, so the app can open offline straight after the first visit.
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/app.js', 'js/signin.js', 'js/store.js', 'js/session.js', 'js/config.js',
  'js/map.js', 'js/road.js', 'js/model.js', 'js/ui.js', 'js/vendor/supabase-2.45.4.js',
  'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png',
];
const scope = new URL('./', self.location).href;

// The app's own files: the page itself, and anything under js/, css/ or assets/.
function isShell(url) {
  if (!url.href.startsWith(scope)) return false;
  const path = url.href.slice(scope.length).split(/[?#]/)[0];
  return path === '' || path === 'index.html' || path === 'manifest.webmanifest' || /^(js|css|assets)\//.test(path);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(SHELL.map((path) => new Request(path, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || !isShell(url)) return;
  // The page is stored once, whatever is after the "?" in its address.
  const key = request.mode === 'navigate' ? new Request(scope + 'index.html') : new Request(url.href.split(/[?#]/)[0]);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // "no-cache" makes the browser check with the server instead of trusting a copy it kept.
      const fresh = await fetch(key, { cache: 'no-cache' });
      if (fresh.ok) cache.put(key, fresh.clone());
      return fresh;
    } catch (err) {
      const kept = await cache.match(key);
      if (kept) return kept;
      throw err;
    }
  })());
});
