import { ImageResponse } from 'next/og'
import { symbolDataUri } from '@/lib/brand/symbol'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0b1f',
        borderRadius: '36px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu via satori (next/og) */}
      <img src={symbolDataUri()} width={144} height={144} alt="" />
    </div>,
    { ...size }
  )
}
