import {
  DEFAULT_DATABASE_PATH,
  DEFAULT_MIGRATIONS_DIR,
  TMDB_DEFAULTS,
  TMDB_IMAGE_BASE,
} from './shared/config/defaults'

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  devtools: { enabled: true },

  compatibilityDate: '2026-07-02',

  runtimeConfig: {
    // NUXT_TMDB_API_KEY: TMDB read access token (v4)
    tmdbApiKey: '',
    // NUXT_DATABASE_PATH: /data/opentvtime.sqlite in the Docker container
    databasePath: DEFAULT_DATABASE_PATH,
    // NUXT_MIGRATIONS_DIR: path to Drizzle migrations at runtime
    migrationsDir: DEFAULT_MIGRATIONS_DIR,
    tmdb: TMDB_DEFAULTS,
    public: {
      tmdbImageBase: TMDB_IMAGE_BASE,
    },
  },

  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '0 5 * * *': ['tmdb:refresh'],
    },
  },

  app: {
    head: {
      title: 'Open TV Time',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'theme-color', content: '#18181b' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/pwa-192x192.png' },
      ],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Open TV Time',
      short_name: 'TV Time',
      description: 'Personal TV show and movie tracker',
      lang: 'en',
      display: 'standalone',
      background_color: '#18181b',
      theme_color: '#18181b',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // No aggressive offline mode: the data changes frequently.
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,png,svg,ico,woff2}'],
    },
  },
})
