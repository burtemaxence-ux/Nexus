import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const size = Math.min(512, Math.max(16, parseInt(req.nextUrl.searchParams.get('size') ?? '192')))
  const radius = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.58)

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2D3A8C',
        borderRadius: `${radius}px`,
      }}
    >
      <span
        style={{
          color: 'white',
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          lineHeight: 1,
        }}
      >
        N
      </span>
    </div>,
    { width: size, height: size }
  )
}
