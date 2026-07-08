import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { symbolDataUri } from '@/lib/brand/symbol'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const size = Math.min(512, Math.max(16, parseInt(req.nextUrl.searchParams.get('size') ?? '192')))
  const radius = Math.round(size * 0.18)
  const markSize = Math.round(size * 0.82)

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0b1f',
        borderRadius: `${radius}px`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu via satori (next/og) */}
      <img src={symbolDataUri()} width={markSize} height={markSize} alt="" />
    </div>,
    { width: size, height: size }
  )
}
