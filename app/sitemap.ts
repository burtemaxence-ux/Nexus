import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'
  return [
    { url: `${base}/`,                           lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/register`,                    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/login`,                      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    // Pages marketing / SEO de contenu (toutes exposent leurs propres metadata).
    { url: `${base}/code-du-travail`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/conformite`,                  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/securite`,                    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/guide-demarrage`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/a-propos`,                    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/devenir-partenaire`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/legal/mentions-legales`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/cgu`,                   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/confidentialite`,        lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/legal/cookies`,               lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]
}
