'use client'

export default function OfflinePage() {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Hors ligne — Quartzbase</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Inter, -apple-system, sans-serif;
            background: #FAFAFA;
            color: #111111;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .card {
            background: #FFFFFF;
            border: 0.5px solid #EBEBEB;
            border-radius: 16px;
            padding: 40px 32px;
            text-align: center;
            max-width: 360px;
            width: 100%;
          }
          .icon {
            width: 64px;
            height: 64px;
            background: #EEF0FA;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
          }
          h1 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
          p { font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 24px; }
          button {
            background: #2D3A8C;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
          }
        `}</style>
      </head>
      <body>
        <div className="card" style={{ background: '#FFFFFF', border: '0.5px solid #EBEBEB', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <div style={{ width: 64, height: 64, background: '#EEF0FA', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2D3A8C" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
            </svg>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, fontFamily: 'Inter, sans-serif', color: '#111111' }}>
            Vous êtes hors ligne
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: '1.6', marginBottom: 24, fontFamily: 'Inter, sans-serif' }}>
            Vérifiez votre connexion internet et réessayez.
            Certaines pages récentes restent accessibles hors ligne.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#2D3A8C', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', fontFamily: 'Inter, sans-serif' }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
