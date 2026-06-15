import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Espaces privés / techniques : jamais indexés.
      disallow: ['/api/', '/auth/', '/manager/', '/employee/', '/billing', '/notifications', '/offline'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
