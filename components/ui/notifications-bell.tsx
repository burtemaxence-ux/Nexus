'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck, Calendar, AlertTriangle, CheckCircle2, RefreshCw, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "A l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Hier'
  if (days < 7) {
    const names = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    return names[new Date(dateStr).getDay()]
  }
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function NotifIcon({ type }: { type: string }) {
  const base = 'h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0'
  if (type === 'planning_published')
    return <div className={cn(base, 'bg-blue-50 dark:bg-blue-950/30')}><Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" /></div>
  if (type === 'leave_approved')
    return <div className={cn(base, 'bg-green-50 dark:bg-green-950/30')}><CheckCircle2 className="h-3.5 w-3.5 text-green-500 dark:text-green-400" /></div>
  if (type === 'leave_rejected')
    return <div className={cn(base, 'bg-red-50 dark:bg-red-950/30')}><X className="h-3.5 w-3.5 text-red-500 dark:text-red-400" /></div>
  if (type === 'reminder_clockout')
    return <div className={cn(base, 'bg-orange-50 dark:bg-orange-950/30')}><AlertTriangle className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" /></div>
  if (type === 'employee_invited' || type === 'employee_clocked_in')
    return <div className={cn(base, 'bg-purple-50 dark:bg-purple-950/30')}><Users className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" /></div>
  if (type.startsWith('replacement'))
    return <div className={cn(base, 'bg-[var(--accent-light)]')}><RefreshCw className="h-3.5 w-3.5 text-[var(--accent)]" /></div>
  return <div className={cn(base, 'bg-[var(--accent-light)]')}><Bell className="h-3.5 w-3.5 text-[var(--accent)]" /></div>
}

// ── Notification row ────────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onClick,
}: {
  notif: Notification
  onClick: (notif: Notification) => void | Promise<void>
}) {
  return (
    <button
      onClick={() => onClick(notif)}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[var(--accent-light)] transition-colors duration-150',
        !notif.read && 'bg-[var(--accent-light)]'
      )}
    >
      <NotifIcon type={notif.type} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-[13px] leading-snug truncate', notif.read ? 'font-normal text-[var(--text-primary)]' : 'font-semibold text-[var(--text-primary)]')}>
          {notif.title}
        </p>
        <p className="text-[12px] text-[var(--text-secondary)] leading-snug mt-0.5 line-clamp-2">
          {notif.body}
        </p>
      </div>
      <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap mt-0.5 flex-shrink-0">
        {relativeTime(notif.created_at)}
      </span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────────

interface NotificationsBellProps {
  isMobile?: boolean
}

export function NotificationsBell({ isMobile = false }: NotificationsBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // silently ignore network errors
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  useEffect(() => {
    if (!open || isMobile) return
    function handleOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open, isMobile])

  function handleBellClick() {
    if (isMobile) {
      router.push('/notifications')
      return
    }
    setOpen((o: boolean) => !o)
  }

  async function markAllRead() {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  async function handleNotifClick(notif: Notification) {
    if (!notif.read) {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      })
      setNotifications((prev: Notification[]) =>
        prev.map((n: Notification) => n.id === notif.id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount((prev: number) => Math.max(0, prev - 1))
    }
    setOpen(false)
    if (notif.action_url) router.push(notif.action_url)
  }

  const bell = (
    <button
      ref={buttonRef}
      onClick={handleBellClick}
      className="relative flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-colors duration-150"
      title="Notifications"
    >
      <Bell className="h-3.5 w-3.5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-[14px] min-w-[14px] px-[3px] rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )

  if (isMobile) return bell

  return (
    <div className="relative">
      {bell}

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[360px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="h-3 w-3" />
                  Tout lire
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-5 h-5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[360px] divide-y divide-[var(--border)]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-7 w-7 text-[var(--text-tertiary)]" />
                <p className="text-[13px] text-[var(--text-tertiary)]">Aucune notification</p>
              </div>
            ) : (
              notifications.map((n: Notification) => (
                <NotifRow key={n.id} notif={n} onClick={handleNotifClick} />
              ))
            )}
          </div>

          <div className="border-t border-[var(--border)] px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); router.push('/notifications') }}
              className="text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Voir toutes les notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
