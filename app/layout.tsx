import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans, Manrope } from 'next/font/google'
import { Toaster } from 'sonner'
import { PwaRegister } from '@/components/ui/pwa-register'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import './globals.css'

// Syne retirée le 2026-07-21 (audit P1-5, reco de juin : grotesque sobre pour
// la cible artisan). Les titres passent sur Manrope — graisse 800 ajoutée pour
// remplacer les usages Syne 700/800.
const inter   = Inter({ subsets: ['latin'], display: 'swap' })
const dmSans  = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans' })
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope', weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://quartzbase.fr'),
  title: 'Quartzbase — Planning & conformité Code du Travail pour la restauration',
  description: 'Le planning de votre équipe, conforme au Code du Travail et généré par l\'IA. Congés, badgeuse et alertes légales. À partir de 49€/mois, sans engagement.',
  applicationName: 'Quartzbase',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quartzbase',
  },
  formatDetection: { telephone: false },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Quartzbase — Gestion de planning pour la restauration',
    description: 'Quartzbase remplace les logiciels de planning traditionnels. Planning, congés, badgeuse et IA.',
    url: 'https://quartzbase.fr',
    siteName: 'Quartzbase',
    locale: 'fr_FR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#6C63FF',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=location.pathname;var app=p.indexOf('/manager')===0||p.indexOf('/employee')===0||p.indexOf('/supervisor')===0;var d;try{d=!app||localStorage.getItem('dp-theme')==='dark'}catch(e){d=!app}if(d){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
      </head>
      <body className={`${inter.className} ${dmSans.variable} ${manrope.variable}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <PwaRegister />
        <Analytics />
        <SpeedInsights />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
