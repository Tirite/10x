import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `BASE_PATH=/10x/` lors d'un déploiement GitHub Pages sur un sous-chemin.
const base = process.env.BASE_PATH ?? '/'
// IP LAN du PC, nécessaire pour que le HMR fonctionne quand on ouvre depuis l'iPhone.
const hmrHost = process.env.HMR_HOST || undefined
// Port vu depuis le navigateur : le conteneur écoute 5173, l'hôte publie DEV_PORT.
const clientPort = Number(process.env.DEV_PORT) || 5273

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Pas de `includeAssets` : `globPatterns` couvre déjà les icônes,
      // et les deux ensemble les précacheraient en double.
      manifest: {
        name: '10x — Journal quotidien',
        short_name: '10x',
        description: 'Notation quotidienne par volets : spirituel, sportif, professionnel…',
        lang: 'fr',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0f1a',
        theme_color: '#0b0f1a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Tout l'applicatif est précaché : l'app démarre en mode avion.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`.replace('//', '/'),
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Le bind-mount Windows ne propage pas les événements inotify.
    watch: { usePolling: true, interval: 300 },
    hmr: hmrHost ? { host: hmrHost, protocol: 'ws', clientPort } : { clientPort },
  },
})
