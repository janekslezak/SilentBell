const CACHE = 'silent-bell-v22';
const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'NoSleep.min.js',
  // Audio (MP3-based, iOS-primed)
  'modules/audio.js',
  'modules/ios-audio.js',
  // Core modules
  'modules/timer.js',
  'modules/state.js',
  'modules/log.js',
  'modules/settings.js',
  'modules/i18n.js',
  // Platform & utilities
  'modules/platform.js',
  'modules/wakelock.js',
  'modules/silent-loop.js',
  'modules/debounced-drag.js',
  'modules/storage.js',
  'modules/screen-dimmer.js',
  // Audio files
  'sounds/sequence_bell_start.mp3',
  'sounds/sequence_bell_interval.mp3',
  'sounds/sequence_bell_end.mp3',
  'sounds/sequence_bell_high_start.mp3',
  'sounds/sequence_bell_high_interval.mp3',
  'sounds/sequence_bell_high_end.mp3',
  'sounds/sequence_chugpi_start.mp3',
  'sounds/sequence_chugpi_interval.mp3',
  'sounds/sequence_chugpi_end.mp3',
  'sounds/chugpi.mp3',
  'sounds/temple_bell_standard.mp3',
  'sounds/temple_bell_high.mp3',
  'sounds/singing_bowl_edge.mp3',
  'sounds/singing_bowl_edge_high.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.all(
        ASSETS.map(url =>
          fetch(url, { cache: 'no-cache' })
            .then(response => {
              if (response.ok) return c.put(url, response);
              console.warn(`Failed to cache: ${url}`);
            })
            .catch(err => { console.warn(`Error caching ${url}:`, err.message); })
        )
      );
    }).catch(err => console.warn('Cache install failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const isAudioFile = e.request.url.match(/\.(mp3|wav|ogg|m4a)$/i);

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Serve cached immediately, update in background
      const fetchPromise = fetch(e.request).then(response => {
        if (response.ok && response.type !== 'opaque') {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise.catch(() => {
        if (e.request.mode === 'navigate') return caches.match('index.html');
        return new Response(isAudioFile ? 'Audio offline' : 'Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
