// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxt/icon',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'nuxt-directus'
  ],

  // Tailwind CSS module options
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js'
  },

  // App configuration
  app: {
    head: {
      title: 'AusBeds China Order',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Spring and Component Inventory Management' }
      ]
    }
  },

  ssr: true,

  directus: {
    url: process.env.DIRECTUS_URL,
    autoRefresh: true,
    cookieNameToken: 'directus_token',
    cookieNameRefreshToken: 'directus_refresh_token',
    cookieMaxAge: 60 * 60 * 24 * 30 // 30 days
  },

  // Alias for lib folder
  alias: {
    '~/lib': './lib'
  }
})