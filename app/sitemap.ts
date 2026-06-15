import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'
  return [
    { url: `${base}/`,                           lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/register`,                    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/login`,                      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/legal/mentions-legales`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/cgu`,                   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/confidentialite`,        lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/cookies`,               lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
