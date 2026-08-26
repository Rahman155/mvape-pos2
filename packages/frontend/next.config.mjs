import withPWA from 'next-pwa';

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: false,
  
  // Workbox configuration for comprehensive runtime caching
  runtimeCaching: [
    // ========================================================================
    // API ENDPOINTS - Network First Strategy (5 minute TTL)
    // ========================================================================
    {
      urlPattern: /^https?:\/\/(?:api\.|localhost:3001\/api)/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes for API data
        },
        // Don't cache authentication endpoints
        denylist: [
          /\/auth\/login/i,
          /\/auth\/logout/i,
          /\/auth\/refresh/i,
          /\/admin\/sensitive/i,
          /\/user\/password/i,
        ],
        cacheableResponse: {
          statuses: [0, 200],
          headers: {
            'x-cache': 'true',
          },
        },
      },
    },

    // ========================================================================
    // HTML DOCUMENTS - Network First with Offline Fallback (1 hour TTL)
    // ========================================================================
    {
      urlPattern: /^https?:\/\/(?:localhost:\d+|[^/]*)\/?(?:[^.]*)?(?:\.html)?$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-pages-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ========================================================================
    // IMAGES - Cache First Strategy (7 day TTL)
    // ========================================================================
    {
      urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico|webp)$/i,
      handler: 'CacheFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ========================================================================
    // JAVASCRIPT & CSS - Cache First (Long-lived assets, 1 year TTL)
    // ========================================================================
    {
      urlPattern: /^https?:\/\/.*\.(?:js|css)$/i,
      handler: 'CacheFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-static-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ========================================================================
    // FONTS - Cache First (Very long-lived, 1 year TTL)
    // ========================================================================
    {
      urlPattern: /^https?:\/\/.*\.(?:woff|woff2|ttf|eot|otf)$/i,
      handler: 'CacheFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-font-cache',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ========================================================================
    // JSON DATA - Network First (24 hour TTL for offline-first data)
    // ========================================================================
    {
      urlPattern: /^https?:\/\/.*\.json$/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-data-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ========================================================================
    // LOCALHOST API (Development - Network First with short TTL)
    // ========================================================================
    {
      urlPattern: /^http:\/\/localhost:3001\/api/i,
      handler: 'NetworkFirst',
      method: 'GET',
      options: {
        cacheName: 'v1-local-api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 2 * 60, // 2 minutes for local dev
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],

  // Custom service worker script to load after Workbox
  // This allows us to add custom cache invalidation, versioning, and sync logic
  publicExcludes: ['/sw-custom.js'],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

export default withPWAConfig(nextConfig);
