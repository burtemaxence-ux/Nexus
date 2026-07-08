import { ImageResponse } from 'next/og'
import { symbolDataUri } from '@/lib/brand/symbol'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0b1f',
        borderRadius: '6px',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu via satori (next/og) */}
      <img src={symbolDataUri()} width={26} height={26} alt="" />
    </div>,
    { ...size }
  )
}
