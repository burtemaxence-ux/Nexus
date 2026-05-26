'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

type PermState = 'loading' | 'unsupported' | 'denied' | 'granted' | 'default'

export function PushSubscribeBanner() {
  const [permState, setPermState] = useState<PermState>('loading')
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermState('unsupported')
      return
    }
    if (localStorage.getItem('push-dismissed')) { setDismissed(true); return }
    setPermState(Notification.permission as PermState)
  }, [])

  async function subscribe() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPermState('denied'); setBusy(false); return }

      // Get VAPID public key
      const keyRes = await fetch('/api/push/vapid-key')
      if (!keyRes.ok) { setBusy(false); return }
      const { publicKey } = await keyRes.json() as { publicKey: string }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      })

      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys }),
      })

      setPermState('granted')
    } catch {
      setPermState('denied')
    }
    setBusy(false)
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('push-dismissed', '1')
  }

  // Only show the banner when permission is not yet granted and user hasn't dismissed
  if (dismissed || permState === 'loading' || permState === 'unsupported' || permState === 'granted') {
    return null
  }

  if (permState === 'denied') {
    return null
  }

  return (
    <div
      className="mx-3 mb-3 rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}
    >
      <Bell className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
          Activer les notifications
        </p>
        <p className="text-[11px]" style={{ color: 'var(--accent)', opacity: 0.7 }}>
          Recevez une alerte quand votre planning est publié
        </p>
      </div>
      <button
        onClick={subscribe}
        disabled={busy}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--accent)', color: 'white' }}
      >
        {busy ? '…' : 'Activer'}
      </button>
      <button onClick={dismiss} className="flex-shrink-0 p-0.5" style={{ color: 'var(--accent)', opacity: 0.6 }}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function PushStatusIcon() {
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setGranted(Notification.permission === 'granted')
  }, [])

  return granted
    ? <Bell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
    : <BellOff className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
}

// Converts a base64url string to Uint8Array (required for VAPID)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from(Array.from(raw).map(c => c.charCodeAt(0)))
}
