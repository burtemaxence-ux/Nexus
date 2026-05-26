import { ImageResponse } from 'next/og'

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
        background: '#2D3A8C',
        borderRadius: '36px',
      }}
    >
      <span style={{ color: 'white', fontSize: '110px', fontWeight: 700, fontFamily: 'sans-serif' }}>N</span>
    </div>,
    { ...size }
  )
}
