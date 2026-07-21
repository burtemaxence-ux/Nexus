'use client'

import { useState, useEffect, useCallback, ElementType } from 'react'
import Link from 'next/link'
import { ChevronLeft, Bell, CheckCheck } from 'lucide-react'

type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  read: boolean
  read_at: string | null
  created_at: string
  data?: Record<string, unknown>
  action_url?: string | null
}

function notifIcon(type: string): string {
  if (type.includes('planning') || type.includes('shift')) return '📅'
  if (type.includes('conge') || type.includes('leave') || type.includes('approved')) return '✅'
  if (type.includes('reject') || type.includes('refused')) return '❌'
  return '🔔'
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} jours`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function EmployeeNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/notifications?limit=50')
    if (res.ok) {
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  async function markAsRead(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications((n: Notification[]) => n.map((notif: Notification) => notif.id === id ? { ...notif, read: true } : notif))
    setUnreadCount((c: number) => Math.max(0, c - 1))
  }

  async function markAllRead() {
    setMarkingAll(true)
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    setNotifications((n: Notification[]) => n.map((notif: Notification) => ({ ...notif, read: true })))
    setUnreadCount(0)
    setMarkingAll(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:px-6 md:py-8" style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* Back link — desktop only */}
      <div className="hidden md:block mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-[13px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
          <ChevronLeft className="h-4 w-4" />
          Mon espace
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 dashboard-s0">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-[20px] font-bold tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
            >
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,107,107,0.15)', color: 'var(--danger)', fontFamily: 'var(--font-dm-sans)' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-[13px] mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
            Vos alertes et mises à jour
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
            style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)', fontFamily: 'var(--font-dm-sans)' }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center dashboard-s1">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <Bell className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-secondary)' }}>
            Aucune notification
          </p>
          <p className="text-[12px] mt-1" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
            Vous serez notifié ici pour votre planning et vos congés.
          </p>
        </div>
      ) : (
        <div className="space-y-2 dashboard-s1">
          {notifications.map((notif: Notification) => {
            const Wrapper = (notif.action_url ? Link : 'div') as ElementType
            const wrapperProps = notif.action_url ? { href: notif.action_url } : {}

            return (
              <Wrapper
                key={notif.id}
                {...(wrapperProps as Record<string, string>)}
                className="block rounded-[14px] p-4 transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: notif.read ? 'transparent' : 'rgba(108,99,255,0.05)',
                  border: notif.read ? '1px solid var(--border)' : '1px solid rgba(108,99,255,0.15)',
                  borderLeft: notif.read ? '1px solid var(--border)' : '2px solid var(--accent)',
                  opacity: notif.read ? 0.65 : 1,
                }}
                onClick={() => { if (!notif.read) markAsRead(notif.id) }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-[20px] flex-shrink-0 mt-0.5">{notifIcon(notif.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-[13px] font-semibold"
                        style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span
                          className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                          style={{ backgroundColor: 'var(--accent)' }}
                        />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-[12px] mt-0.5 line-clamp-2" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[11px] mt-1.5" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                      {formatRelative(notif.created_at)}
                    </p>
                  </div>
                </div>
              </Wrapper>
            )
          })}
        </div>
      )}
    </div>
  )
}
