import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexus.quartz.app'
  return {
    rules: { userAgent: '*', disallow: '/' },
    sitemap: `${base}/sitemap.xml`,
  }
}
