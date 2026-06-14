import type { Metadata, Viewport } from 'next'
import { Inter, Syne, DM_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import { DemoBanner } from '@/components/demo-banner'
import './globals.css'

const inter  = Inter({ subsets: ['latin'], display: 'swap' })
const syne   = Syne({ subsets: ['latin'], display: 'swap', variable: '--font-syne', weight: ['600', '700', '800'] })
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans' })

export const metadata: Metadata = {
  title: 'Quartzbase — Démo',
  description: 'Découvrez Quartzbase, le logiciel de planning pour la restauration.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#2D3A8C',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dp-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} ${syne.variable} ${dmSans.variable}`}>
        <DemoBanner />
        {children}
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
