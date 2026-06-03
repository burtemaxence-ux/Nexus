import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'
  return {
    rules: { userAgent: '*', disallow: '/' },
    sitemap: `${base}/sitemap.xml`,
  }
}
