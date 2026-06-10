'use client'

import { useEffect, useState } from 'react'
import { Sparkles, AlertCircle, Zap } from 'lucide-react'
import Link from 'next/link'

interface QuotaData {
  used: number
  limit: number
  plan: string
  resetIn: number | null
}

interface AiQuotaBadgeProps {
  refreshKey?: number
}

export function AiQuotaBadge({ refreshKey = 0 }: AiQuotaBadgeProps) {
  const [quota, setQuota] = useState<QuotaData | null>(null)

  useEffect(() => {
    fetch('/api/ai/quota')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setQuota(data) })
      .catch(() => {})
  }, [refreshKey])

  if (!quota) return null

  // Unlimited (Pro / Multi-site)
  if (quota.limit === -1) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-green-500/10 text-green-600 border border-green-500/20">
        <Sparkles className="h-3 w-3" />
        Générations IA illimitées ✓
      </span>
    )
  }

  const remaining = quota.limit - quota.used
  const isExhausted = remaining <= 0
  const pct = Math.min((quota.used / quota.limit) * 100, 100)

  // Quota exhausted
  if (isExhausted) {
    return (
      <Link
        href="/billing"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20 hover:opacity-80 transition-opacity"
      >
        <AlertCircle className="h-3 w-3" />
        Quota atteint — Passer au plan Pro →
      </Link>
    )
  }

  // Partial usage
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-[var(--accent)]" />
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
          {quota.used}/{quota.limit} générations utilisées
        </span>
      </div>
      <div className="w-16 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: pct >= 67 ? '#FF6B6B' : pct >= 33 ? '#FFB347' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
