import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quartzbase',
    short_name: 'Quartzbase',
    description: 'Votre planning de travail et badgeuse en un clic',
    start_url: '/employee',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#6C63FF',
    orientation: 'portrait-primary',
    categories: ['productivity', 'business'],
    icons: [
      { src: '/api/pwa/icon?size=192', sizes: '192x192', type: 'image/png' },
      { src: '/api/pwa/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Badgeuse',
        url: '/employee/badgeuse',
        description: 'Pointer mon arrivée',
        icons: [{ src: '/api/pwa/icon?size=96', sizes: '96x96' }],
      },
      {
        name: 'Mon planning',
        url: '/employee/planning',
        description: 'Voir mon planning de la semaine',
        icons: [{ src: '/api/pwa/icon?size=96', sizes: '96x96' }],
      },
    ],
  }
}
