'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Calendar, AlertTriangle, CheckCircle2, RefreshCw, Users, X, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

// ── Helpers (mirrors notifications-bell for standalone page) ──────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
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
  const base = 'h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0'
  if (type === 'planning_published')
    return <div className={cn(base, 'bg-blue-50')}><Calendar className="h-4 w-4 text-blue-500" /></div>
  if (type === 'leave_approved')
    return <div className={cn(base, 'bg-green-50')}><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
  if (type === 'leave_rejected')
    return <div className={cn(base, 'bg-red-50')}><X className="h-4 w-4 text-red-500" /></div>
  if (type === 'reminder_clockout')
    return <div className={cn(base, 'bg-orange-50')}><AlertTriangle className="h-4 w-4 text-orange-500" /></div>
  if (type === 'employee_invited' || type === 'employee_clocked_in')
    return <div className={cn(base, 'bg-purple-50')}><Users className="h-4 w-4 text-purple-500" /></div>
  if (type.startsWith('replacement'))
    return <div className={cn(base, 'bg-[var(--accent-light)]')}><RefreshCw className="h-4 w-4 text-[var(--accent)]" /></div>
  return <div className={cn(base, 'bg-[var(--accent-light)]')}><Bell className="h-4 w-4 text-[var(--accent)]" /></div>
}

const LIMIT = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const offsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(async (offset: number, currentFilter: 'all' | 'unread') => {
    const params = new URLSearchParams({
      limit: String(LIMIT),
      ...(currentFilter === 'unread' ? { unread_only: 'true' } : {}),
    })
    // Supabase pagination: use range via offset param (we handle offset client-side by appending)
    const res = await fetch(`/api/notifications?${params}`)
    if (!res.ok) return null
    return res.json() as Promise<{ notifications: Notification[]; unread_count: number }>
  }, [])

  const load = useCallback(async (reset = false, nextFilter?: 'all' | 'unread') => {
    const activeFilter = nextFilter ?? filter
    if (reset) {
      setLoading(true)
      offsetRef.current = 0
    } else {
      setLoadingMore(true)
    }
    try {
      const data = await fetchPage(offsetRef.current, activeFilter)
      if (!data) return
      const newItems = data.notifications
      setUnreadCount(data.unread_count)
      if (reset) {
        setNotifications(newItems)
      } else {
        setNotifications((prev: Notification[]) => {
          const ids = new Set(prev.map((n: Notification) => n.id))
          return [...prev, ...newItems.filter((n: Notification) => !ids.has(n.id))]
        })
      }
      setHasMore(newItems.length === LIMIT)
      offsetRef.current += newItems.length
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filter, fetchPage])

  // Initial load
  useEffect(() => { load(true) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        load(false)
      }
    }, { threshold: 0.1 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loading, load])

  function handleFilterChange(next: 'all' | 'unread') {
    if (next === filter) return
    setFilter(next)
    load(true, next)
  }

  // Pull to refresh (touch events)
  const touchStartY = useRef(0)
  const refreshing = useRef(false)
  function onTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 80 && !refreshing.current && window.scrollY === 0) {
      refreshing.current = true
      load(true).finally(() => { refreshing.current = false })
    }
  }

  async function markAllRead() {
    if (markingAll) return
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleNotifClick(notif: Notification) {
    if (!notif.read) {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      })
      setNotifications((prev: Notification[]) => prev.map((n: Notification) => n.id === notif.id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      setUnreadCount((prev: number) => Math.max(0, prev - 1))
    }
    if (notif.action_url) router.push(notif.action_url)
  }

  return (
    <div
      className="min-h-screen bg-[var(--bg-page)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border)]">
        {/* Safe area for notched phones */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-light)] transition-colors md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)] flex-1">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lire</span>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex px-4 gap-1 pb-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={cn(
                'px-3 py-1 rounded-full text-[12px] font-medium transition-colors duration-150',
                filter === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--text-primary)]'
              )}
            >
              {f === 'all' ? 'Toutes' : 'Non lues'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--border)] animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Bell className="h-10 w-10 text-[var(--text-tertiary)]" />
            <p className="text-[14px] text-[var(--text-tertiary)]">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] bg-[var(--bg-card)] md:mt-4 md:mx-4 md:rounded-xl md:overflow-hidden md:border md:border-[var(--border)]">
            {notifications.map((notif: Notification) => (
              <button
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={cn(
                  'w-full text-left flex items-start gap-3 px-4 py-4 hover:bg-[var(--accent-light)] active:bg-[var(--accent-light)] transition-colors duration-150',
                  !notif.read && 'bg-[#EEF0FA]'
                )}
              >
                <NotifIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-[14px] leading-snug',
                    notif.read ? 'font-normal text-[var(--text-primary)]' : 'font-semibold text-[var(--text-primary)]'
                  )}>
                    {notif.title}
                  </p>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-snug mt-0.5">
                    {notif.body}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                    {relativeTime(notif.created_at)}
                  </p>
                </div>
                {!notif.read && (
                  <div className="h-2 w-2 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0" />
                )}
              </button>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {loadingMore && (
                <div className="h-5 w-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom safe area */}
      <div style={{ height: 'calc(60px + env(safe-area-inset-bottom, 0px))' }} className="md:hidden" />
    </div>
  )
}
